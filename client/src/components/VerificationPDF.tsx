import { Button } from "@/components/ui/button";
import { QRCode } from "@/components/ui/qr-code";
import { UserProfile } from "@/components/ui/user-profile";
import { useNostrProfile } from "@/hooks/use-nostr-profile";
import { Download, ArrowRight } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useRef } from "react";
import type { Verification, Note } from "@shared/schema";

interface VerificationPDFProps {
  verification: Verification;
  note?: Note;
  verificationUrl: string;
}

export function VerificationPDF({ verification, note, verificationUrl }: VerificationPDFProps) {
  const pdfContentRef = useRef<HTMLDivElement>(null);
  const senderNpub = note?.senderNpub || "";
  const { profile: senderProfile } = useNostrProfile(senderNpub);
  const { profile: recipientProfile } = useNostrProfile(verification.recipientNpub);

  // HTML escape function to prevent XSS
  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const generatePDF = async () => {
    if (!pdfContentRef.current) return;

    try {
      // Create a temporary container for PDF content
      const pdfContainer = document.createElement('div');
      pdfContainer.style.position = 'absolute';
      pdfContainer.style.left = '-9999px';
      pdfContainer.style.top = '0';
      pdfContainer.style.width = '800px';
      pdfContainer.style.backgroundColor = 'white';
      pdfContainer.style.padding = '40px';
      pdfContainer.style.fontFamily = 'Arial, sans-serif';
      
      // Build the HTML content step by step
      const senderDisplayName = escapeHtml(senderProfile?.display_name || senderProfile?.name || 'Sender');
      const recipientDisplayName = escapeHtml(recipientProfile?.display_name || recipientProfile?.name || 'Recipient');
      
      let htmlContent = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
          <div style="display: flex; align-items: center; gap: 8px; font-size: 18px; font-weight: bold; color: #333;">
            <span style="font-size: 20px;">⚓</span>
            <span>meatspacestr</span>
          </div>
          <br>
          <div style="text-align: center; flex: 1;">
            <h1 style="color: #333; margin-bottom: 10px; font-size: 28px;">Proof of Place</h1>
            <p style="color: #666; font-size: 14px; max-width: 600px; margin: 0 auto; line-height: 1.4;">
              Please scan the QR below to unlock your verification request. This will enable the attestor (${senderDisplayName}) to attest to a link between your Nostr identity in cyberspace and your physical address in meatspace.
            </p>
          </div>
          <div style="width: 120px;"></div>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; margin: 40px 0;">
          <!-- Sender -->
          <div style="text-align: center; flex: 1;">
            <div style="width: 80px; height: 80px; border-radius: 50%; background: #f0f0f0; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; overflow: hidden;">`;
      
      if (senderProfile?.picture) {
        htmlContent += `<img src="${escapeHtml(senderProfile.picture)}" style="width: 100%; height: 100%; object-fit: cover;" />`;
      } else {
        htmlContent += '<div style="color: #999; font-size: 24px;">👤</div>';
      }
      
      htmlContent += `
            </div>
            <div style="font-weight: bold; margin-bottom: 5px; font-size: 16px; color: #222;">${senderDisplayName}</div>
            <div style="color: #666; font-size: 12px; word-break: break-all;">${escapeHtml(senderNpub)}</div>
          </div>

          <!-- Arrow -->
          <div style="flex: 0 0 60px; text-align: center; color: #666;">
            <div style="font-size: 24px;">→</div>
          </div>

          <!-- QR Code -->
          <div style="text-align: center; flex: 1;">
            <div id="qr-placeholder" style="width: 200px; height: 200px; margin: 0 auto 15px; border: 1px solid #ddd;"></div>
            <div style="color: #666; font-size: 12px; word-break: break-all;">${escapeHtml(verificationUrl)}</div>
          </div>

          <!-- Arrow -->
          <div style="flex: 0 0 60px; text-align: center; color: #666;">
            <div style="font-size: 24px;">→</div>
          </div>

          <!-- Recipient -->
          <div style="text-align: center; flex: 1;">
            <div style="width: 80px; height: 80px; border-radius: 50%; background: #f0f0f0; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; overflow: hidden;">`;
      
      if (recipientProfile?.picture) {
        htmlContent += `<img src="${escapeHtml(recipientProfile.picture)}" style="width: 100%; height: 100%; object-fit: cover;" />`;
      } else {
        htmlContent += '<div style="color: #999; font-size: 24px;">👤</div>';
      }
      
      htmlContent += `
            </div>
            <div style="font-weight: bold; margin-bottom: 5px; font-size: 16px; color: #222;">${recipientDisplayName}</div>
            <div style="color: #666; font-size: 12px; word-break: break-all;">${escapeHtml(verification.recipientNpub)}</div>
          </div>
        </div>`;

      // Add merchant details section if available
      if (verification.merchantName || verification.merchantAddress) {
        htmlContent += `
          <div style="border-top: 2px solid #eee; padding-top: 30px; margin-top: 30px; text-align: center;">`;
        
        if (verification.merchantName) {
          htmlContent += `
            <div style="margin-bottom: 15px;">
              <div style="font-weight: bold; color: #333; font-size: 18px; margin-bottom: 5px;">${escapeHtml(verification.merchantName)}</div>
            </div>`;
        }

        if (verification.merchantAddress) {
          htmlContent += `
            <div style="margin-bottom: 15px;">
              <div style="color: #666; font-size: 16px;">${escapeHtml(verification.merchantAddress)}</div>
            </div>`;
        }

        htmlContent += `
          </div>`;
      }

      htmlContent += `
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px;">
          ${new Date().toLocaleDateString()}
        </div>
      `;

      pdfContainer.innerHTML = htmlContent;

      document.body.appendChild(pdfContainer);

      // Generate QR code and insert it
      const qrCanvas = document.createElement('canvas');
      const qrCode = await import('qrcode');
      await qrCode.toCanvas(qrCanvas, verificationUrl, { 
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      const qrPlaceholder = pdfContainer.querySelector('#qr-placeholder');
      if (qrPlaceholder) {
        qrPlaceholder.innerHTML = '';
        qrPlaceholder.appendChild(qrCanvas);
      }

      // Wait a bit for images to load
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate PDF
      const canvas = await html2canvas(pdfContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Clean up
      document.body.removeChild(pdfContainer);

      // Download the PDF
      pdf.save(`verification-${verification.id}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      {/* PDF Content Preview (hidden) */}
      <div ref={pdfContentRef} className="hidden">
        <div className="bg-white p-8 font-sans">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Proof of Place Verification</h1>
            <p className="text-gray-600">Nostr-based verification of Proof of Place</p>
          </div>

          <div className="flex items-center justify-between my-8">
            {/* Sender */}
            <div className="text-center flex-1">
              <UserProfile npub={senderNpub} showFull size="lg" className="flex-col" />
            </div>

            {/* Arrow */}
            <div className="flex-0 text-gray-400 mx-4">
              <ArrowRight className="h-6 w-6" />
            </div>

            {/* QR Code */}
            <div className="text-center flex-1">
              <QRCode data={verificationUrl} size={200} className="mx-auto mb-4" />
              <p className="text-xs text-gray-500 break-all">{verificationUrl}</p>
            </div>

            {/* Arrow */}
            <div className="flex-0 text-gray-400 mx-4">
              <ArrowRight className="h-6 w-6" />
            </div>

            {/* Recipient */}
            <div className="text-center flex-1">
              <UserProfile npub={verification.recipientNpub} showFull size="lg" className="flex-col" />
            </div>
          </div>
        </div>
      </div>

      {/* Download Button */}
      <Button onClick={generatePDF} className="w-full">
        <Download className="h-4 w-4 mr-2" />
        Download PDF
      </Button>
    </div>
  );
}