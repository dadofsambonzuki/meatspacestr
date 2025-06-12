import { useEffect } from "react";

interface OGImageGeneratorProps {
  title: string;
  description: string;
  brandName: string;
}

export function OGImageGenerator({ title, description, brandName }: OGImageGeneratorProps) {
  useEffect(() => {
    const updateOGTags = () => {
      const ogImageUrl = '/og-image.png';
      
      // Update or create OG image meta tag
      let ogImageTag = document.querySelector('meta[property="og:image"]') as HTMLMetaElement;
      if (!ogImageTag) {
        ogImageTag = document.createElement('meta');
        ogImageTag.setAttribute('property', 'og:image');
        document.head.appendChild(ogImageTag);
      }
      ogImageTag.setAttribute('content', window.location.origin + ogImageUrl);
      
      // Update Twitter image meta tag
      let twitterImageTag = document.querySelector('meta[property="twitter:image"]') as HTMLMetaElement;
      if (!twitterImageTag) {
        twitterImageTag = document.createElement('meta');
        twitterImageTag.setAttribute('property', 'twitter:image');
        document.head.appendChild(twitterImageTag);
      }
      twitterImageTag.setAttribute('content', window.location.origin + ogImageUrl);
    };
    
    updateOGTags();
  }, [title, description, brandName]);
  
  return null; // This component doesn't render anything visible
}