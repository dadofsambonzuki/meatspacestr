import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRCode } from "@/components/ui/qr-code";
import { Navigation } from "@/components/ui/navigation";
import { UserProfile } from "@/components/ui/user-profile";
import { VerificationPDF } from "@/components/VerificationPDF";
import { NostrExtensionModal } from "@/components/NostrExtensionModal";
import {
  Copy,
  Download,
  ExternalLink,
  Lock,
  Unlock,
  User,
  Mail,
  MapPin,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNostrProfile } from "@/hooks/use-nostr-profile";
import {
  formatNpub,
  hasNostrExtension,
  getNostrPublicKey,
  hexToBech32,
  bech32ToHex,
  decryptNip04Message,
} from "@/lib/nostr";
import type { Verification, Note } from "@shared/schema";

export default function NoteViewer() {
  const params = useParams();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, login, showExtensionModal, setShowExtensionModal } = useAuth();
  const [userPubkey, setUserPubkey] = useState<string | null>(null);
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);
  const [extractedToken, setExtractedToken] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isRecipient, setIsRecipient] = useState(false);
  const [isSender, setIsSender] = useState(false);

  // Get ID from route params and determine route type
  const id = params.id;
  const isVerificationRoute = location.startsWith("/verification/");

  const isLoggedIn = !!user;

  // Query for note by ID or verification by ID
  const {
    data: currentData,
    isLoading: currentLoading,
    error: currentError,
  } = useQuery<{ verification: Verification; note: Note }>({
    queryKey: [isVerificationRoute ? "/api/verification" : "/api/notes", id],
    queryFn: async () => {
      const endpoint = isVerificationRoute
        ? `/api/verification/${id}`
        : `/api/notes/${id}`;
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error("Data not found");
      }
      return response.json();
    },
    enabled: !!id,
  });

  // Get profile names for sender and recipient
  // Convert sender npub to proper format if needed for profile lookup
  const senderNpubForProfile = useMemo(() => {
    if (!currentData?.note?.senderNpub) return null;

    const senderNpub = currentData.note.senderNpub;
    console.log("Processing sender npub for profile:", senderNpub);

    // If it's already in npub format, use it directly
    if (senderNpub.startsWith("npub1")) {
      console.log("Sender npub is already in bech32 format");
      return senderNpub;
    }

    // If it's in hex format, convert to npub
    try {
      const converted = hexToBech32(senderNpub);
      console.log("Converted sender hex to npub:", converted);
      return converted;
    } catch (error) {
      console.error("Error converting sender hex to npub:", error);
      return senderNpub; // Return as-is if conversion fails
    }
  }, [currentData?.note?.senderNpub]);

  const { displayName: senderName, loading: senderLoading } =
    useNostrProfile(senderNpubForProfile);
  const { displayName: recipientName, loading: recipientLoading } =
    useNostrProfile(currentData?.verification?.recipientNpub || null);
  const { displayName: userDisplayName, loading: userProfileLoading } =
    useNostrProfile(user?.npub || null);

  useEffect(() => {
    if (user) {
      // Convert npub to hex for consistency
      const pubkey = bech32ToHex(user.npub);
      setUserPubkey(pubkey);
    }
  }, [user]);

  useEffect(() => {
    if (user && currentData) {
      // Check if user is the recipient
      const userNpub = user.npub;
      const recipientNpub = currentData.verification.recipientNpub;
      setIsRecipient(userNpub === recipientNpub);

      // Check if user is the sender (creator of the verification)
      const senderNpub = currentData.note.senderNpub;
      // Direct comparison should work now that sender npub comes from user's signed event
      const isSenderMatch = userNpub === senderNpub;
      setIsSender(isSenderMatch);
    }
  }, [user, currentData]);

  useEffect(() => {
    if (userPubkey && currentData?.verification) {
      try {
        const userNpub = hexToBech32(userPubkey);
        setIsRecipient(userNpub === currentData.verification.recipientNpub);
      } catch (error) {
        console.error("Error checking recipient status:", error);
      }
    }
  }, [userPubkey, currentData]);

  // Refresh data when user logs out to prevent stale content
  useEffect(() => {
    if (!user) {
      // User logged out, refresh the query data
      queryClient.invalidateQueries({ queryKey: ["/api/verification", id] });
      // Reset state variables
      setDecryptedContent(null);
      setExtractedToken(null);
      setIsRecipient(false);
      setIsSender(false);
      setUserPubkey(null);
    }
  }, [user, queryClient, id]);

  const handleNostrLogin = async () => {
    if (!hasNostrExtension()) {
      setShowExtensionModal(true);
      return;
    }

    try {
      const success = await login();
      if (success) {
        toast({
          title: "Connected",
          description: "Successfully connected to Nostr extension",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Nostr extension",
        variant: "destructive",
      });
    }
  };

  const handleGetExtension = () => {
    if (!hasNostrExtension()) {
      setShowExtensionModal(true);
    }
  };

  const handleVerification = async () => {
    if (!extractedToken) return;

    try {
      // Call the verification API
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: extractedToken }),
      });

      if (response.ok) {
        // Invalidate caches to update status across the app
        queryClient.invalidateQueries({ queryKey: ["/api/verifications"] });
        queryClient.invalidateQueries({
          queryKey: ["/api/verify", extractedToken],
        });

        // Navigate to success page without exposing token
        navigate(`/success`);
      } else {
        toast({
          title: "Verification Failed",
          description: "Unable to verify the token",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify identity",
        variant: "destructive",
      });
    }
  };

  const attemptDecryption = async () => {
    if (!currentData?.note || !userPubkey) {
      return;
    }

    setIsDecrypting(true);
    try {
      // Parse the Nostr event to extract the encrypted content
      let encryptedContent: string;
      let senderPubkey: string;

      try {
        // Try to parse as JSON (signed Nostr event)
        const nostrEvent = JSON.parse(currentData.note.nostrEvent);

        if (nostrEvent.content && nostrEvent.pubkey) {
          encryptedContent = nostrEvent.content;
          senderPubkey = nostrEvent.pubkey;
        } else {
          throw new Error("Invalid Nostr event format");
        }
      } catch (parseError) {
        // Fallback: treat as raw encrypted content
        encryptedContent = currentData.note.encryptedContent;
        senderPubkey = bech32ToHex(currentData.note.senderNpub);
      }

      // Decrypt using real NIP-04 encryption with nostr-tools
      const decrypted = await decryptNip04Message(
        senderPubkey,
        encryptedContent,
      );

      if (decrypted) {
        // Extract token from the decrypted content
        const tokenMatch = decrypted.match(/Attestation Token: ([^\s\n]+)/);
        const extractToken = tokenMatch ? tokenMatch[1] : null;

        setDecryptedContent(decrypted);

        if (extractToken) {
          setExtractedToken(extractToken);
        }

        toast({
          title: "Message Decrypted",
          description: "Successfully decrypted with NIP-04",
        });
      } else {
        toast({
          title: "Decryption Failed",
          description:
            "Unable to decrypt the message. Please ensure you are the intended recipient.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Decryption failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Decryption Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDecrypting(false);
    }
  };

  if (currentLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center pt-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading attestation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (currentError || !currentData) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-16">
          <Card className="max-w-md mx-auto">
            <CardContent className="text-center p-6 md:p-8">
              <h1 className="text-lg md:text-xl font-bold text-foreground mb-2">
                Attestation Not Found
              </h1>
              <p className="text-sm md:text-base text-muted-foreground mb-4">
                The attestation you're looking for doesn't exist or has been
                removed.
              </p>
              <Button onClick={() => navigate("/")}>Go Home</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleCopyEvent = () => {
    navigator.clipboard.writeText(currentData.note.nostrEvent);
    toast({
      title: "Copied",
      description: "Nostr event JSON copied to clipboard",
    });
  };

  const handleDownloadEvent = () => {
    const blob = new Blob([currentData.note.nostrEvent], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nostr-event-${id?.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        <Card className="mb-6">
          <CardContent className="p-4 md:p-8">
            <div className="text-center mb-6">
              <h1 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                {isVerificationRoute
                  ? "Identity Attestation"
                  : "Encrypted Nostr Note"}
              </h1>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-muted-foreground">
                <span className="text-sm md:text-base">
                  {isVerificationRoute
                    ? "Attestation request for"
                    : "This note is encrypted for"}
                </span>
                <div className="min-w-0">
                  <UserProfile
                    npub={currentData.verification.recipientNpub}
                    showFull
                    size="sm"
                  />
                </div>
              </div>
            </div>

            {/* Verification Metadata Section */}
            {isVerificationRoute && (
              <div className="bg-muted rounded-lg p-4 md:p-6 mb-6">
                <h2 className="text-base md:text-lg font-semibold text-foreground mb-4">
                  Attestation Details
                </h2>
                <div className="space-y-3 text-sm">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                    <span className="text-muted-foreground">
                      Attestation ID:
                    </span>
                    <span className="font-mono text-foreground break-all">
                      {currentData.verification.id}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge
                      variant={
                        currentData.verification.status === "verified"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {currentData.verification.status}
                    </Badge>
                  </div>
                  {currentData.verification.merchantName && (
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                      <span className="text-muted-foreground">Merchant:</span>
                      <span className="text-foreground break-words">
                        {currentData.verification.merchantName}
                      </span>
                    </div>
                  )}
                  {currentData.verification.merchantAddress && (
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                      <span className="text-muted-foreground">Address:</span>
                      <span className="text-foreground break-words">
                        {currentData.verification.merchantAddress}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2">
                    <span className="text-muted-foreground">Created by:</span>
                    <div className="min-w-0">
                      <UserProfile
                        npub={senderNpubForProfile || ""}
                        showFull
                        size="sm"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="text-foreground">
                      {new Date(
                        currentData.verification.createdAt,
                      ).toLocaleDateString()}
                    </span>
                  </div>
                  {currentData.verification.verifiedAt && (
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                      <span className="text-muted-foreground">Verified:</span>
                      <span className="text-foreground">
                        {new Date(
                          currentData.verification.verifiedAt,
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Connected As Section - directly below Attestation Details */}
            {isLoggedIn && isVerificationRoute && (
              <div
                className={`border rounded-lg p-6 text-center mb-6 ${
                  isSender
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700"
                    : isRecipient
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700"
                      : "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700"
                }`}
              >
                <div className="text-center">
                  <User
                    className={`w-6 h-6 mx-auto mb-3 ${
                      isSender
                        ? "text-blue-600 dark:text-blue-400"
                        : isRecipient
                          ? "text-green-600 dark:text-green-400"
                          : "text-gray-600 dark:text-gray-400"
                    }`}
                  />
                  <div>
                    <span
                      className={`font-medium block mb-3 ${
                        isSender
                          ? "text-blue-900 dark:text-blue-100"
                          : isRecipient
                            ? "text-green-900 dark:text-green-100"
                            : "text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      Connected as
                    </span>
                    <div className="mb-4 flex justify-center">
                      <UserProfile npub={user!.npub} showFull size="sm" />
                    </div>
                    {isSender ? (
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        You created this attestation
                      </p>
                    ) : isRecipient ? (
                      <p className="text-sm text-green-800 dark:text-green-200">
                        This attestation is addressed to you
                      </p>
                    ) : (
                      <p className="text-sm text-gray-800 dark:text-gray-200">
                        You are viewing this attestation
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Publish Attestation Card - Only show for verified attestations when user is the creator */}
            {isVerificationRoute && isSender && currentData.verification.status === "verified" && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="w-5 h-5" />
                    Publish Attestation to Nostr
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3">
                      Share Your Verified Attestation
                    </h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                      Now that this attestation has been verified by the attestee, you can publish it to Nostr relays of your choice. 
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                      This will create an Attestation event (<code className="bg-blue-100 dark:bg-blue-800 px-1 rounded text-xs">kind 18171</code>) for the verified Place.
                    </p>
                  </div>
                  <Button 
                    className="w-full" 
                   
                    disabled={true}
                    onClick={() => {
                      toast({
                        title: "Coming Soon",
                        description: "Nostr relay publishing is not yet implemented",
                        variant: "default",
                      });
                    }}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Publish Attestation (Coming Soon)
                  </Button>

                </CardContent>
              </Card>
            )}

            {/* QR Code and Mailing Instructions - Only show on verification route and for sender */}
            {isVerificationRoute && isSender && (
              <div className="grid gap-6 md:grid-cols-2 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ExternalLink className="w-5 h-5" />
                      Attestation URL & QR Code
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-center">
                      <QRCode
                        data={`${window.location.origin}/verification/${currentData.verification.id}`}
                        size={200}
                        className="border rounded-lg p-4 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Attestation URL:
                      </label>
                      <div className="mt-1 p-2 bg-muted rounded text-xs font-mono break-all">
                        {window.location.origin}/verification/
                        {currentData.verification.id}
                      </div>
                      <div className="space-y-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `${window.location.origin}/verification/${currentData.verification.id}`,
                            );
                            toast({
                              title: "Copied",
                              description:
                                "Attestation URL copied to clipboard",
                            });
                          }}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy URL
                        </Button>


                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      Mailing Instructions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Delivery Information */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                      <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3">
                        Delivery Information
                      </h4>

                      {currentData.verification.merchantName && (
                        <div className="mb-3">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                              Merchant/Business:
                            </span>
                          </div>
                          <p className="text-sm text-blue-800 dark:text-blue-200 ml-6">
                            {currentData.verification.merchantName}
                          </p>
                        </div>
                      )}

                      {currentData.verification.merchantAddress ? (
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                               Address:
                            </span>
                          </div>
                          <pre className="text-sm text-blue-800 dark:text-blue-200 ml-6 whitespace-pre-wrap">
                            {currentData.verification.merchantAddress}
                          </pre>
                        </div>
                      ) : (
                        <div className="text-sm text-blue-700 dark:text-blue-300 italic">
                          No delivery address specified
                        </div>
                      )}
                    </div>

                    {/* Step-by-step instructions */}
                    <div>
                      <h4 className="font-medium text-foreground mb-3">
                        How to send verification:
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-start gap-2">
                          <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                            1
                          </div>
                          <p>Download the PDF.</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                            2
                          </div>
                          <p>Mail it to the address above.</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                            3
                          </div>
                          <p>
                            Recipient scans QR code and visits the URL to
                            complete verification.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* PDF Download - moved to bottom of mailing instructions */}
                    <div className="pt-4 mt-4 border-t border-border">
                      <h4 className="font-medium text-foreground mb-3">
                        Download PDF for Mailing:
                      </h4>
                      <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                        <VerificationPDF
                          verification={currentData.verification}
                          note={currentData.note}
                          verificationUrl={`${window.location.origin}/verification/${currentData.verification.id}`}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="space-y-6 mt-6">
              {/* Nostr Login Section */}
              {!isLoggedIn && hasNostrExtension() && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                        Connect Your Nostr Identity
                      </h3>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Connect to check if this attestation is related to you.
                      </p>
                    </div>
                    <Button onClick={handleNostrLogin} size="sm">
                      <User className="w-4 h-4 mr-2" />
                      Login with Nostr
                    </Button>
                  </div>
                </div>
              )}

              {!hasNostrExtension() && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                  <h3 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                    Nostr Extension Required
                  </h3>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                    To decrypt this message, install a Nostr browser extension
                    like Alby or nos2x
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGetExtension}
                  >
                    Get Nostr Extension
                  </Button>
                </div>
              )}



              {/* Decrypted Content */}
              {decryptedContent && (
                <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-700 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Unlock className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <h3 className="font-medium text-green-900 dark:text-green-100">
                      Decrypted Message
                    </h3>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded p-4 border border-green-200 dark:border-green-600 mb-4">
                    <pre className="whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100 font-sans leading-relaxed">
                      {decryptedContent}
                    </pre>
                  </div>

                  {/* Show verification button only if verification token was extracted and verification is pending */}
                  {extractedToken &&
                    currentData.verification.status === "pending" && (
                      <div className="text-center">
                        <Button onClick={handleVerification} size="sm">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Complete Verification
                        </Button>
                      </div>
                    )}
                </div>
              )}

              {/* Extension Decryption Section */}
              {isRecipient && !decryptedContent && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-lg p-6 text-center">
                  <div className="flex items-center gap-2 mb-4 justify-center">
                    <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-medium text-blue-900 dark:text-blue-100">
                      Decrypt Verification Message
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      The verification token to complete your Proof-of-Place Attestation is encrypted inside this note.
                      <div></div>
                      Click the button below to decrypt it with your Nostr extension.
                    </p>
                    <Button
                      onClick={attemptDecryption}
                      disabled={isDecrypting}
                      className="w-full"
                    >
                      {isDecrypting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Decrypting...
                        </>
                      ) : (
                        <>
                          <Unlock className="w-4 h-4 mr-2" />
                          Decrypt Message
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-blue-600 dark:text-blue-300">
                      Your Nostr extension will prompt you to decrypt this message using your private key.
                    </p>
                  </div>
                </div>
              )}



              {!decryptedContent && isRecipient && !isSender && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Alternative: Manual Import
                  </h3>
                  <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>1. Copy the JSON event below</li>
                    <li>
                      2. Import it into your Nostr client (Amethyst, Primal, etc.)
                    </li>
                    <li>3. Decrypt the message using your private key</li>
                    <li>
                      4. Follow the verification URL in the decrypted content
                    </li>
                  </ol>
                </div>
              )}

              {/* Nostr Event JSON - only show for recipients, not senders, and only if content hasn't been decrypted */}
              {isRecipient && !isSender && !decryptedContent && (
                <div className="bg-muted rounded-lg p-4">
                  <h3 className="font-medium text-foreground mb-3">
                    Nostr Event JSON
                  </h3>
                  <div className="bg-card rounded border border-border p-3 max-h-48 overflow-y-auto">
                    <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">
                      {currentData.note.nostrEvent}
                    </pre>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" onClick={handleCopyEvent}>
                      <Copy className="w-4 h-4 mr-1" />
                      Copy JSON
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDownloadEvent}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              )}

            </div>
          </CardContent>
        </Card>
      </div>

      <NostrExtensionModal
        open={showExtensionModal}
        onOpenChange={setShowExtensionModal}
      />
    </div>
  );
}
