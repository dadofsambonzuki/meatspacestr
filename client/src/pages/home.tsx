import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/ui/navigation";
import { OGImageGenerator } from "@/components/OGImageGenerator";
import { Plus, List, Search, Key, Mail, CheckCircle } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <OGImageGenerator 
        title="Proof-of-Place Attestations over Nostr"
        description="Cryptographically verify that a Nostr identity in cyberspace has access to a physical address in meatspace"
        brandName="meatspacestr"
      />
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="font-bold text-foreground mb-6 text-[44px]">
            Proof-of-Place Attestations over Nostr
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Cryptographically verify that a Nostr identity in{" "}
            <span className="font-semibold text-blue-600">cyberspace</span>
            <div></div>
            has access to a physical address in{" "}
            <span className="font-semibold text-orange-600">meatspace</span>.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="p-8 text-center hover:shadow-lg transition-shadow flex flex-col h-full">
            <CardHeader className="flex-grow">
              <div className="mx-auto mb-4 p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full w-fit">
                <Plus className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-2xl">Create Attestations</CardTitle>
              <CardDescription className="text-lg">
                Generate encrypted attestation tokens
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Link href="/create">
                <Button size="lg" className="w-full">
                  Create
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="p-8 text-center hover:shadow-lg transition-shadow flex flex-col h-full">
            <CardHeader className="flex-grow">
              <div className="mx-auto mb-4 p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full w-fit">
                <List className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle className="text-2xl">View Attestations</CardTitle>
              <CardDescription className="text-lg">
                View attestations and their current statuses
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Link href="/status">
                <Button size="lg" className="w-full">
                  View
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="p-8 text-center hover:shadow-lg transition-shadow flex flex-col h-full">
            <CardHeader className="flex-grow">
              <div className="mx-auto mb-4 p-3 bg-green-100 dark:bg-green-900/20 rounded-full w-fit">
                <Search className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl">Complete Attestation</CardTitle>
              <CardDescription className="text-lg">
                Use tokens to complete attestation
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Link href="/verify">
                <Button size="lg" className="w-full">
                  Verify
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <Card className="mb-16">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              How Proof-of-Place Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="mx-auto mb-4 p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full w-fit">
                  <Key className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold mb-2 text-foreground">
                  1. Sign & Encrypt
                </h3>
                <p className="text-muted-foreground">
                  Attestor creates a Nostr event with encrypted content
                  containing an attestation token.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 p-3 bg-amber-100 dark:bg-amber-900/20 rounded-full w-fit">
                  <Mail className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="font-semibold mb-2 text-foreground">
                  2. Mail Encrypted Note
                </h3>
                <p className="text-muted-foreground">
                  Attestor physically mails the QR code URL directing the
                  attestee to the encrypted note.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 p-3 bg-green-100 dark:bg-green-900/20 rounded-full w-fit">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold mb-2 text-foreground">
                  3. Complete Attestation
                </h3>
                <p className="text-muted-foreground">
                  Attestee decrypts the message and uses the attestation token
                  to complete Proof-of-Place.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-muted-foreground">
          <p>
            Powered by the{" "}
            <a
              href="https://nostr.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
            >
              Nostr Protocol
            </a>
            {" • "}
            Made with 💜 by{" "}
            <a
              href="https://nosta.me/nprofile1qqsvfa085adgecmg84ffelcxx6zrn3ffu5jrc6cjtwng0zge3ptv43c82kf5d"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
            >
              Nathan Day
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
