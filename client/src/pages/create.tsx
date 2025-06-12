import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Navigation } from "@/components/ui/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { hasNostrExtension, getNostrPublicKey, hexToBech32, bech32ToHex } from "@/lib/nostr";
import type { Verification, Note } from "@shared/schema";

const createVerificationSchema = z.object({
  recipientNpub: z.string().regex(/^npub1[a-z0-9]{58}$/i, "Invalid recipient npub format"),
  merchantName: z.string().optional().default(""),
  customMessage: z.string().optional().default(""),
  merchantAddress: z.string().optional().default(""),
  saveForLater: z.boolean().optional().default(false),
});

type CreateVerificationForm = z.infer<typeof createVerificationSchema>;

export default function CreatePage() {
  const [, navigate] = useLocation();
  const { user, login } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateVerificationForm>({
    resolver: zodResolver(createVerificationSchema),
    defaultValues: {
      recipientNpub: "",
      merchantName: "",
      customMessage: "",
      merchantAddress: "",
      saveForLater: false,
    },
  });



  // Create verification mutation with client-side signing
  const createVerificationMutation = useMutation({
    mutationFn: async (data: CreateVerificationForm) => {
      // Check if user has Nostr extension for signing
      if (!hasNostrExtension()) {
        throw new Error("Nostr extension (like Alby) is required to create signed messages");
      }

      try {
        // Get user's public key
        const userPubkey = await getNostrPublicKey();
        if (!userPubkey) {
          throw new Error("Failed to get user's public key from Nostr extension");
        }

        const userNpub = hexToBech32(userPubkey);
        console.log('User will sign with:', userNpub);

        // First, get a temporary token from server for the verification URL
        const tempResponse = await apiRequest("POST", "/api/verifications/prepare", {
          recipientNpub: data.recipientNpub,
          customMessage: data.customMessage || "",
          merchantAddress: data.merchantAddress || "",
          merchantName: data.merchantName || "",
        });
        const { token, verificationUrl } = await tempResponse.json();

        // Create content to encrypt including the verification token
        const contentToEncrypt = `${data.customMessage || 'No message'}\n\nVerification Token: ${token}`;

        // Convert recipient npub to hex for encryption
        const recipientPubkey = bech32ToHex(data.recipientNpub);

        // Encrypt using user's extension (NIP-04)
        if (!window.nostr?.nip04) {
          throw new Error("Nostr extension does not support NIP-04 encryption");
        }

        const encryptedContent = await window.nostr.nip04.encrypt(recipientPubkey, contentToEncrypt);

        // Create Nostr event template
        const eventTemplate = {
          pubkey: userPubkey,
          created_at: Math.floor(Date.now() / 1000),
          kind: 4, // NIP-04 encrypted direct message
          tags: [["p", recipientPubkey]],
          content: encryptedContent,
        };

        // Ask user to sign the event
        const signedEvent = await window.nostr.signEvent(eventTemplate);
        console.log('User signed event:', signedEvent);

        // Send the signed event to server
        const response = await apiRequest("POST", "/api/verifications/finalize", {
          token: token,
          signedEvent: signedEvent,
        });

        return response.json();
      } catch (error) {
        console.error("Client-side signing failed:", error);
        throw error;
      }
    },
    onSuccess: async (result: { verification: Verification; note: Note }) => {
      // Clear form
      form.reset();
      
      // Invalidate relevant caches to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["/api/verifications/verified"] });
      if (user?.npub) {
        queryClient.invalidateQueries({ queryKey: ["/api/verifications/pending", user.npub] });
      }
      
      toast({
        title: "Verification created successfully",
        description: "Redirecting to verification page...",
      });
      
      // Navigate to the verification page
      navigate(`/verification/${result.verification.id}`);
    },
    onError: (error) => {
      toast({
        title: "Failed to create verification",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateVerificationForm) => {
    createVerificationMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto py-8 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Create Verification Note</h1>
          <p className="text-muted-foreground mt-2">
            Create an encrypted note with verification URL for identity verification
          </p>
        </div>

        <div className="flex justify-center">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Create New Verification</CardTitle>
              <CardDescription>
                Fill in the details to create an encrypted verification note
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="recipientNpub"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recipient Npub *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="npub1..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="merchantName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Merchant Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter merchant or business name..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="merchantAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Merchant Address</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Street Address&#10;City, State/Province&#10;Postal Code&#10;Country"
                            className="min-h-[100px] resize-none"
                            rows={4}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground mt-1">
                          Enter the complete merchant address including street, city, state/province, postal code, and country
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customMessage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Message (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Enter any additional message or instructions..."
                            className="min-h-[80px] resize-none"
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={createVerificationMutation.isPending}
                  >
                    {createVerificationMutation.isPending ? "Creating..." : "Create Encrypted Verification"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}