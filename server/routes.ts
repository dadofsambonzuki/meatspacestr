import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertVerificationSchema, npubSchema, tokenSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {


  // Prepare verification (get token and URL for client-side signing)
  app.post("/api/verifications/prepare", async (req, res) => {
    try {
      const body = insertVerificationSchema.parse(req.body);
      npubSchema.parse(body.recipientNpub);
      
      const { token, verificationUrl } = await storage.prepareVerification(body);
      res.json({ token, verificationUrl });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to prepare verification" });
    }
  });

  // Finalize verification with signed event
  app.post("/api/verifications/finalize", async (req, res) => {
    try {
      const { token, signedEvent } = req.body;
      if (!token || !signedEvent) {
        return res.status(400).json({ message: "Missing token or signed event" });
      }
      const result = await storage.finalizeVerification(token, signedEvent);
      res.json(result);
    } catch (error) {
      console.error('Error in finalize endpoint:', error);
      res.status(500).json({ message: "Failed to finalize verification" });
    }
  });

  // Get only verified verifications (public)
  app.get("/api/verifications/verified", async (req, res) => {
    try {
      const verifications = await storage.getVerifiedVerifications();
      res.json(verifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch verified verifications" });
    }
  });

  // Get pending verifications for authenticated user (NIP-98 HTTP Auth)
  app.get("/api/verifications/pending", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Nostr ')) {
        return res.status(401).json({ message: "Missing or invalid authorization header" });
      }
      
      // Parse the base64-encoded Nostr event from Authorization header
      const base64Event = authHeader.substring(6); // Remove 'Nostr ' prefix
      let authEvent;
      
      try {
        const eventJson = Buffer.from(base64Event, 'base64').toString('utf-8');
        authEvent = JSON.parse(eventJson);
      } catch (e) {
        return res.status(401).json({ message: "Invalid authorization event format" });
      }
      
      // Validate NIP-98 requirements
      if (authEvent.kind !== 27235) {
        return res.status(401).json({ message: "Invalid event kind for HTTP auth" });
      }
      
      // Check timestamp (within 60 seconds as per NIP-98)
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - authEvent.created_at) > 60) {
        return res.status(401).json({ message: "Authorization event expired" });
      }
      
      // Find the required tags
      const urlTag = authEvent.tags.find((tag: string[]) => tag[0] === 'u');
      const methodTag = authEvent.tags.find((tag: string[]) => tag[0] === 'method');
      
      if (!urlTag || !methodTag) {
        return res.status(401).json({ message: "Missing required tags in auth event" });
      }
      
      // Verify URL and method match the request
      const expectedUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      const receivedUrl = urlTag[1];
      
      // For development/replit, be more flexible with URL matching
      const urlsMatch = receivedUrl === expectedUrl || 
                       receivedUrl.endsWith(req.originalUrl) ||
                       receivedUrl.replace('https://', 'http://') === expectedUrl ||
                       receivedUrl.replace('http://', 'https://') === expectedUrl;
      
      if (!urlsMatch || methodTag[1] !== 'GET') {
        console.log('NIP-98 URL mismatch:');
        console.log('Expected:', expectedUrl);
        console.log('Received:', receivedUrl);
        console.log('Method expected: GET, received:', methodTag[1]);
        return res.status(401).json({ message: "URL or method mismatch in auth event" });
      }
      
      // Convert pubkey to npub for storage lookup
      const { npubEncode } = await import('nostr-tools/nip19');
      const npub = npubEncode(authEvent.pubkey);
      
      // Get pending verifications for this user
      const verifications = await storage.getPendingVerificationsByCreator(npub);
      res.json(verifications);
    } catch (error) {
      console.error('Auth error:', error);
      res.status(500).json({ message: "Failed to authenticate or fetch pending verifications" });
    }
  });

  // Get specific verification
  app.get("/api/verifications/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (!id || id.trim() === '') {
        return res.status(400).json({ message: "Invalid verification ID" });
      }
      
      const verification = await storage.getVerification(id);
      if (!verification) {
        return res.status(404).json({ message: "Verification not found" });
      }
      
      const note = await storage.getNoteByVerificationId(verification.id);
      res.json({ verification, note });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch verification" });
    }
  });

  // Get note by ID for note page (returns verification and note data)
  app.get("/api/notes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (!id || id.trim() === '') {
        return res.status(400).json({ message: "Invalid note ID" });
      }
      
      const note = await storage.getNote(id);
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }
      
      const verification = await storage.getVerification(note.verificationId);
      if (!verification) {
        return res.status(404).json({ message: "Verification not found" });
      }
      
      res.json({ verification, note });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch note" });
    }
  });





  // POST endpoint for verification (called from client)
  app.post("/api/verify", async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }
      
      tokenSchema.parse(token);
      
      const result = await storage.verifyVerification(token);
      if (!result) {
        return res.status(404).json({ message: "Invalid token" });
      }
      
      // Check if result contains an error
      if ('error' in result) {
        return res.status(400).json({ message: result.error });
      }
      
      // At this point, TypeScript knows result has verification and note properties
      const successResult = result as { verification: any; note: any };
      
      res.json({ 
        message: "Verification successful", 
        verification: {
          id: successResult.verification.id,
          recipientNpub: successResult.verification.recipientNpub,
          customMessage: successResult.verification.customMessage,
          merchantAddress: successResult.verification.merchantAddress,
          merchantName: successResult.verification.merchantName,
          status: successResult.verification.status,
          verifiedAt: successResult.verification.verifiedAt
        },
        note: successResult.note
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid token format" });
      } else {
        res.status(500).json({ message: "Verification failed" });
      }
    }
  });





  // GET endpoint for individual verification page (using verification ID from URL)
  app.get("/api/verification/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id || id.trim() === '') {
        return res.status(400).json({ message: "Verification ID is required" });
      }
      
      const verification = await storage.getVerification(id);
      if (!verification) {
        return res.status(404).json({ message: "Verification not found" });
      }
      
      const note = await storage.getNoteByVerificationId(verification.id);
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }
      
      res.json({ verification, note });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch verification" });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}
