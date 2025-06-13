import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/ui/navigation";
import { UserProfile } from "@/components/ui/user-profile";
import { VerificationPDF } from "@/components/VerificationPDF";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, Calendar, User, Building, MapPin, MessageSquare, Plus, CheckCircle, LogIn } from "lucide-react";
import { formatNpub, bech32ToHex } from "@/lib/nostr";
import { Link } from "wouter";
import type { Verification } from "@shared/schema";

export default function StatusPage() {
  const { user, login, isLoading: authLoading } = useAuth();

  // Fetch verified verifications with sender info for public display
  const { data: verifiedVerifications = [], isLoading: verifiedLoading } = useQuery<Array<{verification: Verification, senderNpub?: string}>>({
    queryKey: ["/api/verifications/verified-with-sender"],
    queryFn: async () => {
      const response = await fetch("/api/verifications/verified");
      if (!response.ok) {
        throw new Error("Failed to fetch verified verifications");
      }
      const verifications = await response.json();
      
      // Fetch sender info for each verification
      const verificationsWithSender = await Promise.all(
        verifications.map(async (verification: Verification) => {
          try {
            const verificationResponse = await fetch(`/api/verification/${verification.id}`);
            if (verificationResponse.ok) {
              const { note } = await verificationResponse.json();
              return { verification, senderNpub: note?.senderNpub };
            } else {
              return { verification, senderNpub: undefined };
            }
          } catch (error) {
            return { verification, senderNpub: undefined };
          }
        })
      );
      
      return verificationsWithSender;
    },
  });

  // Fetch pending verifications if user is logged in
  const { data: pendingVerifications = [], isLoading: pendingLoading } = useQuery<Verification[]>({
    queryKey: ["/api/verifications/pending", user?.npub],
    enabled: !!user?.npub,
    queryFn: async () => {
      if (!user?.npub) return [];
      
      // Get signature from Nostr extension
      if (!window.nostr) {
        throw new Error("Nostr extension not available");
      }
      
      // Create NIP-98 authentication event
      const url = `${window.location.origin}/api/verifications/pending`;
      const timestamp = Math.floor(Date.now() / 1000);
      
      const authEvent = {
        pubkey: bech32ToHex(user.npub),
        created_at: timestamp,
        kind: 27235, // NIP-98 HTTP Auth
        tags: [
          ['u', url],
          ['method', 'GET']
        ],
        content: '',
      };
      
      const signedAuthEvent = await window.nostr.signEvent(authEvent);
      
      // Encode the signed event as base64 for the Authorization header
      const base64Event = btoa(JSON.stringify(signedAuthEvent));
      
      const response = await fetch("/api/verifications/pending", {
        method: "GET",
        headers: {
          "Authorization": `Nostr ${base64Event}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch pending verifications");
      }
      
      return response.json();
    },
  });

  const handleLogin = async () => {
    await login();
  };

  const sortedVerifiedVerifications = [...verifiedVerifications].sort((a, b) => 
    new Date(b.verification.createdAt).getTime() - new Date(a.verification.createdAt).getTime()
  );

  const sortedPendingVerifications = [...pendingVerifications].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Attestations</h1>
          <p className="text-muted-foreground">
            View attestations and their current status.
          </p>
        </div>

        {/* User's Pending Attestations (if logged in) */}
        {user ? (
          <div className="mb-12 bg-card rounded-lg p-6 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">Your Pending Attestations</h2>
            </div>

            {pendingLoading ? (
              <p className="text-center text-muted-foreground">Loading your pending attestations...</p>
            ) : sortedPendingVerifications.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">You have no pending attestations.</p>
                <Link href="/create">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {sortedPendingVerifications.map((verification) => (
                  <Card key={verification.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Attestation #{verification.id}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            Pending
                          </Badge>
                          <Link href={`/verification/${verification.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">To:</span>
                          <UserProfile npub={verification.recipientNpub} showFull size="sm" />
                        </div>
                        {verification.merchantName && (
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Merchant:</span>
                            <span className="font-medium text-foreground">{verification.merchantName}</span>
                          </div>
                        )}
                        {verification.merchantAddress && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Address:</span>
                            <span className="font-medium text-foreground">{verification.merchantAddress}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Created:</span>
                          <span className="font-medium text-foreground">{new Date(verification.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>



                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mb-12 bg-card rounded-lg p-6 shadow-sm border border-border">
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Your Pending Attestations</h2>
              <p className="text-muted-foreground mb-6">Login with your Nostr extension to view your pending attestations</p>
              <Button onClick={handleLogin} disabled={authLoading} className="bg-purple-600 hover:bg-purple-700">
                <LogIn className="h-4 w-4 mr-2" />
                {authLoading ? "Connecting..." : "Login with Nostr"}
              </Button>
            </div>
          </div>
        )}

        {/* Public Verified Notes */}
        <div className="bg-card rounded-lg p-6 shadow-sm border border-border">
          <h2 className="text-2xl font-bold text-foreground mb-6">All Verified Attestations</h2>

          {verifiedLoading ? (
            <p className="text-center text-muted-foreground">Loading verified attestations...</p>
          ) : sortedVerifiedVerifications.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No verified attestations yet. Be the first to create one!</p>
              <Link href="/create">
                <Button>Create First Attestation</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {sortedVerifiedVerifications.map(({ verification, senderNpub }) => (
                <Card key={verification.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Attestation #{verification.id}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Verified
                        </Badge>
                        <Link href={`/verification/${verification.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="space-y-2">
                        {senderNpub && (
                          <div className="flex items-center">
                            <span className="text-muted-foreground w-12">From:</span>
                            <UserProfile npub={senderNpub} showFull size="sm" />
                          </div>
                        )}
                        <div className="flex items-center">
                          <span className="text-muted-foreground w-12">To:</span>
                          <UserProfile npub={verification.recipientNpub} showFull size="sm" />
                        </div>
                      </div>
                      {verification.merchantName && (
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Merchant:</span>
                          <span className="font-medium text-foreground">{verification.merchantName}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Verified:</span>
                        <span className="font-medium text-foreground">{verification.verifiedAt ? new Date(verification.verifiedAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Created:</span>
                        <span className="font-medium text-foreground">{new Date(verification.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}