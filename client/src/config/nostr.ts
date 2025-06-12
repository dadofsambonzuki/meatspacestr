// Nostr configuration
export const NOSTR_CONFIG = {
  // Default relays for profile resolution and general queries
  DEFAULT_RELAYS: [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.primal.net',
    'wss://relay.nostr.band',
    'wss://relay.snort.social',
    'wss://eden.nostr.land'
  ],
  
  // Timeout for relay connections (ms)
  CONNECTION_TIMEOUT: 5000,
  
  // Maximum number of events to fetch per query
  MAX_EVENTS_PER_QUERY: 100,
  
  // Profile cache duration (ms) - 10 minutes
  PROFILE_CACHE_DURATION: 10 * 60 * 1000
};

export type NostrConfig = typeof NOSTR_CONFIG;