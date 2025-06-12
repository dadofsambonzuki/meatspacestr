import { useState, useEffect } from 'react';
import { SimplePool, Event } from 'nostr-tools';
import { bech32ToHex } from '@/lib/nostr';
import { NOSTR_CONFIG } from '@/config/nostr';

interface NostrProfile {
  name?: string;
  display_name?: string;
  about?: string;
  picture?: string;
  nip05?: string;
}

export function useNostrProfile(npub: string | null) {
  const [profile, setProfile] = useState<NostrProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!npub || typeof npub !== 'string') {
      setProfile(null);
      return;
    }

    let isCancelled = false;
    const pool = new SimplePool();

    async function fetchProfile() {
      if (!npub) return; // Additional safety check
      
      setLoading(true);
      setError(null);

      try {
        const pubkeyHex = bech32ToHex(npub as string);
        
        const events = await pool.querySync(NOSTR_CONFIG.DEFAULT_RELAYS, {
          kinds: [0],
          authors: [pubkeyHex],
          limit: 1
        });

        if (isCancelled) return;

        if (events.length > 0) {
          const profileEvent = events[0];
          const profileData = JSON.parse(profileEvent.content) as NostrProfile;
          setProfile(profileData);
        } else {
          setProfile(null);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Error fetching Nostr profile:', err);
          setError('Failed to fetch profile');
          setProfile(null);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
        pool.close(NOSTR_CONFIG.DEFAULT_RELAYS);
      }
    }

    fetchProfile();

    return () => {
      isCancelled = true;
      pool.close(NOSTR_CONFIG.DEFAULT_RELAYS);
    };
  }, [npub]);

  const displayName = profile?.display_name || profile?.name || null;

  return {
    profile,
    displayName,
    loading,
    error
  };
}