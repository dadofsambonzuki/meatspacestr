// Nostr utility functions for production use with browser extensions
import { nip19 } from 'nostr-tools';

export function validateNpub(npub: string): boolean {
  return /^npub1[a-z0-9]{58}$/i.test(npub);
}

export function formatNpub(npub: string): string {
  if (npub.length <= 12) return npub;
  return `${npub.slice(0, 8)}...${npub.slice(-6)}`;
}

// NIP-07 Browser Extension Interface
interface NostrExtension {
  getPublicKey(): Promise<string>;
  signEvent(event: any): Promise<any>;
  nip04?: {
    encrypt(pubkey: string, plaintext: string): Promise<string>;
    decrypt(pubkey: string, ciphertext: string): Promise<string>;
  };
}

declare global {
  interface Window {
    nostr?: NostrExtension;
  }
}

export function hasNostrExtension(): boolean {
  return typeof window !== 'undefined' && !!window.nostr;
}

export async function getNostrPublicKey(): Promise<string | null> {
  if (!hasNostrExtension()) {
    return null;
  }
  
  try {
    const pubkey = await window.nostr!.getPublicKey();
    
    if (!pubkey || typeof pubkey !== 'string') {
      return null;
    }
    
    return pubkey;
  } catch (error) {
    console.error('Failed to get public key from extension:', error);
    return null;
  }
}

export function hexToBech32(hex: string): string {
  try {
    if (!hex || hex.length !== 64) {
      throw new Error('Invalid hex length');
    }
    return nip19.npubEncode(hex);
  } catch (error) {
    console.error('Failed to convert hex to bech32:', error);
    throw error;
  }
}

export function bech32ToHex(npub: string): string {
  try {
    const decoded = nip19.decode(npub);
    return decoded.data as string;
  } catch (error) {
    console.error('Failed to convert bech32 to hex:', error);
    throw error;
  }
}

export async function decryptNip04Message(senderPubkey: string, encryptedContent: string): Promise<string | null> {
  if (!hasNostrExtension()) {
    return null;
  }
  
  if (!window.nostr?.nip04) {
    return null;
  }
  
  try {
    if (!senderPubkey || senderPubkey.length !== 64) {
      throw new Error('Invalid sender pubkey format');
    }
    
    const decryptPromise = window.nostr.nip04.decrypt(senderPubkey, encryptedContent);
    const timeoutPromise = new Promise<null>((_, reject) => 
      setTimeout(() => reject(new Error('Decryption timeout')), 30000)
    );
    
    const decrypted = await Promise.race([decryptPromise, timeoutPromise]);
    return decrypted;
  } catch (error) {
    console.error('NIP-04 decryption failed:', error);
    if (error instanceof Error && error.message === 'Decryption timeout') {
      throw new Error('Decryption timed out - please try again');
    }
    throw error;
  }
}
