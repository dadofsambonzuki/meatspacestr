import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Download, Chrome, Globe } from "lucide-react";

interface NostrExtensionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NostrExtensionModal({ open, onOpenChange }: NostrExtensionModalProps) {
  const extensions = [
    {
      name: "Alby",
      description: "Popular Bitcoin Lightning & Nostr wallet",
      chromeUrl: "https://chrome.google.com/webstore/detail/alby-bitcoin-lightning-wa/iokeahhehimjnekafflcihljlcjccdbe",
      firefoxUrl: "https://addons.mozilla.org/en-US/firefox/addon/alby/",
      website: "https://getalby.com/"
    },
    {
      name: "nos2x",
      description: "Simple Nostr signer extension",
      chromeUrl: "https://chrome.google.com/webstore/detail/nos2x/kpgefcfmnafjgpblomihpgmejjdanjjp",
      firefoxUrl: "https://addons.mozilla.org/en-US/firefox/addon/nos2x/",
      website: "https://github.com/fiatjaf/nos2x"
    },
    {
      name: "Flamingo",
      description: "Nostr key manager with advanced features",
      chromeUrl: "https://chrome.google.com/webstore/detail/flamingo/nkooibbdoegmijpoedfmhfjoiicepnno",
      firefoxUrl: null,
      website: "https://www.flamingo.social/"
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Download className="h-5 w-5" />
            Nostr Extension Required
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            To use meatspacestr, you need a Nostr signing extension installed in your browser. 
            This extension manages your Nostr identity securely and allows you to sign messages.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-blue-50 dark:bg-blue-950 p-3 sm:p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 text-sm sm:text-base">
              What is a Nostr extension?
            </h4>
            <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200">
              A Nostr extension is a browser add-on that securely stores your Nostr private key and 
              handles signing operations.
            </p>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <h4 className="font-semibold text-sm sm:text-base">Recommended Extensions:</h4>
            
            {extensions.map((ext) => (
              <div key={ext.name} className="border rounded-lg p-3 sm:p-4 space-y-3">
                <div>
                  <h5 className="font-medium text-sm sm:text-base">{ext.name}</h5>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{ext.description}</p>
                </div>
                
                <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="w-full sm:w-auto justify-center sm:justify-start"
                  >
                    <a
                      href={ext.chromeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1"
                    >
                      <Chrome className="h-4 w-4" />
                      Chrome
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                  
                  {ext.firefoxUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="w-full sm:w-auto justify-center sm:justify-start"
                    >
                      <a
                        href={ext.firefoxUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1"
                      >
                        <Globe className="h-4 w-4" />
                        Firefox
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="w-full sm:w-auto justify-center sm:justify-start"
                  >
                    <a
                      href={ext.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1"
                    >
                      Website
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 dark:bg-amber-950 p-3 sm:p-4 rounded-lg">
            <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2 text-sm sm:text-base">
              After Installation:
            </h4>
            <ol className="text-xs sm:text-sm text-amber-800 dark:text-amber-200 space-y-1 list-decimal list-inside">
              <li>Restart your browser or refresh this page</li>
              <li>Set up your Nostr identity in the extension</li>
              <li>Click the Login button again</li>
            </ol>
          </div>
        </div>

        <div className="flex justify-end pt-2 sm:pt-0">
          <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}