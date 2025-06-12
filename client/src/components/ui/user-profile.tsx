import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNostrProfile } from "@/hooks/use-nostr-profile";
import { formatNpub } from "@/lib/nostr";
import { User } from "lucide-react";

interface UserProfileProps {
  npub: string;
  showFull?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function UserProfile({ npub, showFull = false, size = "md", className = "" }: UserProfileProps) {
  const { profile, displayName, loading } = useNostrProfile(npub);

  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8", 
    lg: "h-12 w-12"
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`${sizeClasses[size]} rounded-full bg-muted animate-pulse`} />
        {showFull && <div className="h-4 w-24 bg-muted animate-pulse rounded" />}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={profile?.picture} alt={displayName || formatNpub(npub)} />
        <AvatarFallback>
          <User className="h-1/2 w-1/2" />
        </AvatarFallback>
      </Avatar>
      {showFull && (
        <div className="flex flex-col">
          {displayName && (
            <span className={`font-medium ${textSizeClasses[size]}`}>
              {displayName}
            </span>
          )}
          <span className={`text-muted-foreground ${textSizeClasses[size]}`}>
            {formatNpub(npub)}
          </span>
        </div>
      )}
    </div>
  );
}