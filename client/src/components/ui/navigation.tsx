import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, List, Search, LogIn, User, Menu, X, Anchor } from "lucide-react";
import { formatNpub } from "@/lib/nostr";
import { useNostrProfile } from "@/hooks/use-nostr-profile";
import { useIsMobile } from "@/hooks/use-mobile";
import { NostrExtensionModal } from "@/components/NostrExtensionModal";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useState } from "react";

export function Navigation() {
  const [location] = useLocation();
  const { user, login, logout, isLoading, showExtensionModal, setShowExtensionModal } = useAuth();
  const { displayName, loading: profileLoading } = useNostrProfile(user?.npub || null);
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: "/create", label: "Create", icon: Plus },
    { path: "/status", label: "Status", icon: List },
    { path: "/verify", label: "Verify", icon: Search },
  ];

  const handleLogin = async () => {
    await login();
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // Desktop Navigation
  const DesktopNav = () => (
    <div className="hidden md:flex items-center space-x-4">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.path;
        return (
          <Link key={item.path} href={item.path}>
            <Button
              variant={isActive ? "default" : "ghost"}
              size="sm"
              className="flex items-center gap-2"
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Button>
          </Link>
        );
      })}
      
      {/* Theme Toggle */}
      <ThemeToggle />
      
      {/* Auth Status */}
      <div className="border-l border-gray-200 dark:border-border pl-4 ml-4">
        {user ? (
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>
                {profileLoading ? "Loading..." : (displayName || formatNpub(user.npub))}
              </span>
            </div>
            <Button onClick={logout} variant="ghost" size="sm">
              Logout
            </Button>
          </div>
        ) : (
          <Button onClick={handleLogin} disabled={isLoading} size="sm" variant="outline">
            <LogIn className="h-4 w-4 mr-1" />
            {isLoading ? "Connecting..." : "Login"}
          </Button>
        )}
      </div>
    </div>
  );

  // Mobile Navigation
  const MobileNav = () => (
    <div className="md:hidden flex items-center space-x-2">
      <ThemeToggle />
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-80">
          <div className="py-6">
            <div className="space-y-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                return (
                  <Link key={item.path} href={item.path} onClick={closeMobileMenu}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      size="lg"
                      className="w-full justify-start gap-3"
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
              
              {/* Theme Toggle for Mobile */}
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm font-medium text-foreground">Theme</span>
                <ThemeToggle />
              </div>
              
              <div className="border-t pt-4 mt-6 border-border">
                {user ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 px-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {profileLoading ? "Loading..." : (displayName || formatNpub(user.npub))}
                      </span>
                    </div>
                    <Button onClick={() => { logout(); closeMobileMenu(); }} variant="outline" size="lg" className="w-full">
                      Logout
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={() => { handleLogin(); closeMobileMenu(); }} 
                    disabled={isLoading} 
                    size="lg" 
                    className="w-full"
                  >
                    <LogIn className="h-5 w-5 mr-2" />
                    {isLoading ? "Connecting..." : "Login"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );

  return (
    <>
      <nav className="bg-white dark:bg-background border-b border-gray-200 dark:border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/">
                <div className="flex items-center gap-2 cursor-pointer">
                  <Anchor className="h-6 w-6 text-foreground" />
                  <h1 className="text-xl font-bold text-foreground">
                    meatspacestr
                  </h1>
                </div>
              </Link>
            </div>
            
            <DesktopNav />
            <MobileNav />
          </div>
        </div>
      </nav>
      
      <NostrExtensionModal 
        open={showExtensionModal} 
        onOpenChange={setShowExtensionModal} 
      />
    </>
  );
}