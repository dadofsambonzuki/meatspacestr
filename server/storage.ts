import { verifications, notes, type Verification, type Note, type InsertVerification, type InsertNote } from "@shared/schema";
import { nanoid } from "nanoid";
import { nip19, verifyEvent } from "nostr-tools";
import { eq, and, desc, isNull } from "drizzle-orm";
import { db } from "./db";

// No server-side encryption or signing - everything handled by client browser extension

export interface IStorage {
  prepareVerification(verification: InsertVerification): Promise<{ token: string; verificationUrl: string }>;
  finalizeVerification(token: string, signedEvent: any): Promise<{ verification: Verification; note: Note }>;
  getVerification(id: string): Promise<Verification | undefined>;
  getVerificationByToken(token: string): Promise<Verification | undefined>;
  getNote(id: string): Promise<Note | undefined>;
  getNoteByVerificationId(verificationId: string): Promise<Note | undefined>;
  verifyVerification(token: string): Promise<{ verification: Verification; note: Note } | { error: string } | undefined>;
  getAllVerifications(): Promise<Verification[]>;
  getVerifiedVerifications(): Promise<Verification[]>;
  getPendingVerificationsByCreator(creatorNpub: string): Promise<Verification[]>;
  updateNote(id: string, updates: { encryptedContent: string; senderNpub: string }): Promise<Note | undefined>;
}



export class DatabaseStorage implements IStorage {
  private pendingVerifications: Map<string, { insertVerification: InsertVerification; token: string; verificationUrl: string; noteId: string; verificationId: string }>;

  constructor() {
    this.pendingVerifications = new Map();
  }
  async getVerification(id: string): Promise<Verification | undefined> {
    const result = await db.select().from(verifications).where(eq(verifications.id, id)).limit(1);
    return result[0];
  }

  async getVerificationByToken(token: string): Promise<Verification | undefined> {
    const result = await db.select().from(verifications).where(eq(verifications.token, token)).limit(1);
    return result[0];
  }

  async getNote(id: string): Promise<Note | undefined> {
    const result = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
    return result[0];
  }

  async getNoteByVerificationId(verificationId: string): Promise<Note | undefined> {
    const result = await db.select().from(notes).where(eq(notes.verificationId, verificationId)).limit(1);
    return result[0];
  }

  async verifyVerification(token: string): Promise<{ verification: Verification; note: Note } | { error: string } | undefined> {
    console.log('Attempting to verify token:', token);
    
    // Use an atomic update to prevent race conditions
    const [updatedVerification] = await db
      .update(verifications)
      .set({ 
        status: "verified", 
        verifiedAt: new Date() 
      })
      .where(and(
        eq(verifications.token, token),
        eq(verifications.status, "pending")
      ))
      .returning();
    
    if (!updatedVerification) {
      // Token either doesn't exist, is already used, or is not pending
      const verification = await this.getVerificationByToken(token);
      if (!verification) {
        console.log('Token not found:', token);
        return undefined;
      }
      if (verification.verifiedAt || verification.status !== "pending") {
        console.log('Token already used:', token, 'status:', verification.status, 'verifiedAt:', verification.verifiedAt);
        return { error: "Token has already been used" };
      }
      console.log('Unknown verification error for token:', token);
      return undefined;
    }
    
    console.log('Token verified successfully:', token, 'verification:', updatedVerification.id);
    
    const note = await this.getNoteByVerificationId(updatedVerification.id);
    if (note) {
      return { verification: updatedVerification, note };
    }
    return undefined;
  }

  async getAllVerifications(): Promise<Verification[]> {
    return await db.select().from(verifications).orderBy(desc(verifications.createdAt));
  }

  async getVerifiedVerifications(): Promise<Verification[]> {
    return await db.select().from(verifications)
      .where(eq(verifications.status, "verified"))
      .orderBy(desc(verifications.createdAt));
  }

  async getPendingVerificationsByCreator(creatorNpub: string): Promise<Verification[]> {
    // For now, return all pending verifications since we don't track creators yet
    // TODO: Add creator tracking to verifications table if needed
    const result = await db
      .select()
      .from(verifications)
      .where(eq(verifications.status, "pending"))
      .orderBy(desc(verifications.createdAt));
    
    return result;
  }

  async prepareVerification(insertVerification: InsertVerification): Promise<{ token: string; verificationUrl: string }> {
    const token = nanoid(32);
    const noteId = nanoid(16);
    const verificationId = nanoid(16);
    const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] || 'http://localhost:5000';
    const verificationUrl = `${baseUrl}/note/${noteId}`;
    
    // Insert verification record into database
    await db.insert(verifications).values({
      id: verificationId,
      recipientNpub: insertVerification.recipientNpub,
      merchantName: insertVerification.merchantName || "",
      merchantAddress: insertVerification.merchantAddress || "",
      customMessage: insertVerification.customMessage || "",
      token: token,
      status: "pending",
      createdAt: new Date(),
      verifiedAt: null,
    });
    
    // Store noteId mapping for finalization
    this.pendingVerifications.set(token, {
      insertVerification,
      token,
      verificationUrl,
      noteId,
      verificationId
    });
    
    return { token, verificationUrl };
  }

  async finalizeVerification(token: string, signedEvent: any): Promise<{ verification: Verification; note: Note }> {
    // Get the pending verification
    const verification = await this.getVerificationByToken(token);
    if (!verification) {
      throw new Error('Verification not found');
    }

    // Validate signed event
    if (!verifyEvent(signedEvent)) {
      throw new Error('Invalid event signature');
    }

    console.log('Event signature valid:', true);

    // Extract sender npub from the signed event
    const senderPubkey = signedEvent.pubkey;
    const senderNpub = nip19.npubEncode(senderPubkey);

    // Generate a new noteId for this finalization
    const noteId = nanoid(16);
    
    // Use the signed event content directly (this should be the encrypted content from client)
    const encryptedContent = signedEvent.content;
    
    // Insert note with the user's signed event data
    await db.insert(notes).values({
      id: noteId,
      verificationId: verification.id,
      encryptedContent: encryptedContent,
      senderNpub: senderNpub,
      nostrEvent: JSON.stringify(signedEvent, null, 2),
      createdAt: new Date(),
    });

    // Get the inserted note
    const [note] = await db.select().from(notes).where(eq(notes.id, noteId));

    console.log('Finalized verification:', verification.id);
    return { verification, note };
  }

  async updateNote(id: string, updates: { encryptedContent: string; senderNpub: string }): Promise<Note | undefined> {
    const [updatedNote] = await db
      .update(notes)
      .set({
        encryptedContent: updates.encryptedContent,
        senderNpub: updates.senderNpub,
      })
      .where(eq(notes.id, id))
      .returning();
    
    return updatedNote;
  }
}

export const storage = new DatabaseStorage();