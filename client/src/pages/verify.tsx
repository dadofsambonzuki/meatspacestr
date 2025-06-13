import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navigation } from "@/components/ui/navigation";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function VerifyPage() {
  const [location] = useLocation();
  const searchParams = location.includes('?') ? location.split('?')[1] : '';
  const urlParams = new URLSearchParams(searchParams);
  const urlToken = urlParams.get('token');
  
  const [token, setToken] = useState(urlToken || '');
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (urlToken) {
      handleVerification(urlToken);
    }
  }, [urlToken]);

  const handleVerification = async (verificationToken: string) => {
    if (!verificationToken.trim()) {
      toast({
        title: "Token Required",
        description: "Please enter an attestation token.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: verificationToken })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setVerificationResult(result);
        toast({
          title: "Attestation Successful", 
          description: "The link between your physical address in meatspace and your npub in cyberspace has been verified!",
        });
      } else {
        toast({
          title: "Attestation Failed",
          description: result.message || "Attestation failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Attestation Failed",
        description: "Network error occurred",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerification(token);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="flex items-center justify-center p-4 pt-16">
        <Card className="w-full max-w-md">
          <CardHeader>
          <CardTitle>Verify Attestation</CardTitle>
          <CardDescription>
            Enter your verification token below to verify your Proof of Place Attestation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!verificationResult && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>

                <Input
                  id="token"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Enter attestation token..."
                  className="w-full"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isVerifying || !token.trim()}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify"
                )}
              </Button>
            </form>
          )}

          {verificationResult && (
            <div className="space-y-4">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-500 dark:text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-green-700 dark:text-green-300">Verification Complete</h3>
                <p className="text-muted-foreground">{verificationResult.message}</p>
              </div>

              {verificationResult.note && (
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <h4 className="font-medium text-foreground">Verified Note Details:</h4>
                  <div className="text-sm space-y-1 text-foreground">
                    <p><strong>ID:</strong> {verificationResult.note.id}</p>
                    <p><strong>Recipient:</strong> {verificationResult.note.recipientNpub}</p>
                    {verificationResult.note.merchantName && (
                      <p><strong>Merchant:</strong> {verificationResult.note.merchantName}</p>
                    )}
                    {verificationResult.note.customMessage && (
                      <p><strong>Message:</strong> {verificationResult.note.customMessage}</p>
                    )}
                    {verificationResult.note.physicalAddress && (
                      <p><strong>Address:</strong> {verificationResult.note.physicalAddress}</p>
                    )}
                    <p><strong>Verified At:</strong> {new Date().toLocaleString()}</p>
                  </div>
                </div>
              )}

            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}