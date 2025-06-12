import React, { createContext, useContext, useState, useEffect } from 'react';
import { getNostrPublicKey, hexToBech32, hasNostrExtension } from '@/lib/nostr';

interface AuthContextType {
  user: { npub: string } | null;
  login: () => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  showExtensionModal: boolean;
  setShowExtensionModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ npub: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showExtensionModal, setShowExtensionModal] = useState(false);

  const login = async (): Promise<boolean> => {
    if (!hasNostrExtension()) {
      setShowExtensionModal(true);
      return false;
    }

    setIsLoading(true);
    try {
      const pubkey = await getNostrPublicKey();
      if (pubkey) {
        const npub = hexToBech32(pubkey);
        setUser({ npub });
        localStorage.setItem('nostr_auth', JSON.stringify({ npub }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('nostr_auth');
  };

  // Check for existing auth on mount
  useEffect(() => {
    const stored = localStorage.getItem('nostr_auth');
    if (stored) {
      try {
        const authData = JSON.parse(stored);
        setUser(authData);
      } catch (error) {
        localStorage.removeItem('nostr_auth');
      }
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, showExtensionModal, setShowExtensionModal }}>
      {children}
    </AuthContext.Provider>
  );
}