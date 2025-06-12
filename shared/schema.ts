import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Verifications table - contains metadata and business logic
export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  recipientNpub: text("recipient_npub").notNull(),
  merchantName: text("merchant_name").notNull().default(""),
  merchantAddress: text("physical_address").notNull().default(""),
  customMessage: text("custom_message").notNull().default(""),
  token: text("token").notNull().unique(), // Token for verification process
  status: text("status").notNull().default("pending"), // pending, verified, expired
  createdAt: timestamp("created_at").notNull().defaultNow(),
  verifiedAt: timestamp("verified_at"),
});

// Notes table - contains encrypted content, 1-to-1 with verifications
export const notes = pgTable("notes", {
  id: text("id").primaryKey(),
  verificationId: text("verification_id").notNull().references(() => verifications.id),
  encryptedContent: text("encrypted_content").notNull(),
  senderNpub: text("sender_npub").notNull(),
  nostrEvent: text("nostr_event").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVerificationSchema = createInsertSchema(verifications).pick({
  recipientNpub: true,
  merchantName: true,
  merchantAddress: true,
  customMessage: true,
});

export const insertNoteSchema = createInsertSchema(notes).pick({
  verificationId: true,
  encryptedContent: true,
  senderNpub: true,
  nostrEvent: true,
});

export type InsertVerification = z.infer<typeof insertVerificationSchema>;
export type Verification = typeof verifications.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notes.$inferSelect;

// Validation schemas
export const npubSchema = z.string().regex(/^npub1[a-z0-9]{58}$/i, "Invalid npub format");
export const tokenSchema = z.string().min(16, "Token must be at least 16 characters");
