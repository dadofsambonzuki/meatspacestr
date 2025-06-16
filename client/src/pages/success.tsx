import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/ui/navigation";
import { CheckCircle, Home, List } from "lucide-react";

export default function SuccessPage() {

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="flex items-center justify-center p-4 pt-16">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center px-4 md:px-6">
            <div className="mx-auto mb-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-full w-fit">
              <CheckCircle className="h-6 md:h-8 w-6 md:w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-xl md:text-2xl text-green-900 dark:text-green-100">Verification Complete!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4 px-4 md:px-6">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 md:p-4">
              <p className="text-sm md:text-base text-green-800 dark:text-green-200">
                Your nostr identity in cyberspace has been successfully linked to your physical address in meatspace!
              </p>
            </div>
            
            <div className="space-y-2">
              <Link href="/">
                <Button className="w-full">
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </Link>
              
              <Link href="/status">
                <Button variant="outline" className="w-full">
                  <List className="w-4 h-4 mr-2" />
                  View All Notes
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}