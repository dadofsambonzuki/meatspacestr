import { Button } from "@/components/ui/button";
import { QRCode } from "@/components/ui/qr-code";
import { UserProfile } from "@/components/ui/user-profile";
import { useNostrProfile } from "@/hooks/use-nostr-profile";
import { Download, ArrowRight, Anchor } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useRef } from "react";
import type { Verification, Note } from "@shared/schema";

interface VerificationPDFProps {
  verification: Verification;
  note?: Note;
  verificationUrl: string;
}

export function VerificationPDF({
  verification,
  note,
  verificationUrl,
}: VerificationPDFProps) {
  const pdfContentRef = useRef<HTMLDivElement>(null);
  const senderNpub = note?.senderNpub || "";
  const { profile: senderProfile } = useNostrProfile(senderNpub);
  const { profile: recipientProfile } = useNostrProfile(
    verification.recipientNpub,
  );

  // HTML escape function to prevent XSS
  const escapeHtml = (text: string): string => {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  };

  const generatePDF = async () => {
    if (!pdfContentRef.current) return;

    try {
      // Create a temporary container for PDF content
      const pdfContainer = document.createElement("div");
      pdfContainer.style.position = "absolute";
      pdfContainer.style.left = "-9999px";
      pdfContainer.style.top = "0";
      pdfContainer.style.width = "800px";
      pdfContainer.style.backgroundColor = "white";
      pdfContainer.style.padding = "40px";
      pdfContainer.style.fontFamily = "Arial, sans-serif";

      // Build the HTML content step by step
      const senderDisplayName = escapeHtml(
        senderProfile?.display_name || senderProfile?.name || "Sender",
      );
      const recipientDisplayName = escapeHtml(
        recipientProfile?.display_name || recipientProfile?.name || "Recipient",
      );

      let htmlContent = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
          <div style="display: flex; align-items: center; gap: 8px; font-size: 18px; font-weight: bold; color: #333;">
            <img
              src="/favicon.svg"
              alt="Brand Logo"
              style="width: 20px; height: 20px;"
            />
            <span>meatspacestr</span>
          </div>
          <br>
          <div style="text-align: center; flex: 1;">
          </div>
          <div style="width: 120px;"></div>
        </div>

        <!-- Address Area placeholder (22/60/85.5/25.5mm) -->
        <div style="position: absolute; left: 22mm; top: 60mm; width: 85.5mm; height: 25.5mm; border: 1px solid #eee; background: #fafafa;">
          <!-- Address text will be added as selectable PDF text overlay -->
        </div>

        <div style="margin-top: 100mm;">`;
      
      // Add "Proof of Place for <merchant>" title
      if (verification.merchantName) {
        htmlContent += `
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; font-size: 28px; margin: 0; font-weight: bold;">Proof of Place for ${escapeHtml(verification.merchantName)}</h1>
          </div>`;
      } else {
        htmlContent += `
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; font-size: 28px; margin: 0; font-weight: bold;">Proof of Place</h1>
          </div>`;
      }
      
      htmlContent += `
          <div style="text-align: center; margin-bottom: 20px;">
            <p style="color: #666; font-size: 14px; max-width: 600px; margin: 0 auto; line-height: 1.4;">
              Please scan the QR below to unlock your attestation request. This will enable the attestor (${senderDisplayName}) to attest to a link between your Nostr identity in cyberspace and your physical address in meatspace.
            </p>
          </div>
          
          <div style="display: flex; align-items: flex-start; justify-content: space-between; margin: 40px 0;">
          <div style="text-align: center; flex: 1; display: flex; flex-direction: column; align-items: center; min-height: 200px;">
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
          <div style="flex: 0 0 60px; text-align: center; color: #666; margin-top: 60px;">
            <div style="font-size: 24px;">→</div>
          </div>

          <!-- QR Code -->
          <div style="text-align: center; flex: 1; display: flex; flex-direction: column; align-items: center; min-height: 200px; justify-content: center;">
            <div id="qr-placeholder" style="width: 150px; height: 150px; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;"></div>
            <div style="color: #666; font-size: 12px; word-break: break-all; max-width: 200px;">${escapeHtml(verificationUrl)}</div>
          </div>

          <!-- Arrow -->
          <div style="flex: 0 0 60px; text-align: center; color: #666; margin-top: 60px;">
            <div style="font-size: 24px;">→</div>
          </div>

          <!-- Recipient -->
          <div style="text-align: center; flex: 1; display: flex; flex-direction: column; align-items: center; min-height: 200px;">
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
        </div>
        </div>`;

      htmlContent += `
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px;">
          ${new Date().toLocaleDateString()}
        </div>
      `;

      pdfContainer.innerHTML = htmlContent;

      document.body.appendChild(pdfContainer);

      // Generate QR code and insert it
      const qrCanvas = document.createElement("canvas");
      const qrCode = await import("qrcode");
      await qrCode.toCanvas(qrCanvas, verificationUrl, {
        width: 150,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      const qrPlaceholder = pdfContainer.querySelector("#qr-placeholder");
      if (qrPlaceholder) {
        qrPlaceholder.innerHTML = "";
        qrPlaceholder.appendChild(qrCanvas);
      }

      // Wait for images to load (reduced from 1000ms)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Generate PDF with optimization
      const canvas = await html2canvas(pdfContainer, {
        scale: 1.5, // Reduced from 2 to 1.5 for smaller file size
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });

      // Use JPEG with compression instead of PNG
      const imgData = canvas.toDataURL("image/jpeg", 0.8); // 80% quality
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true, // Enable PDF compression
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Add selectable text overlay for address area (22/60/85.5/25.5mm)
      if (verification.merchantName || verification.merchantAddress) {
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0); // Black color for better readability
        
        let yPosition = 65; // Starting Y position (60mm + 5mm padding)
        
        // Add merchant name if available
        if (verification.merchantName) {
          pdf.setFont("helvetica", "bold");
          pdf.text(verification.merchantName, 25, yPosition); // 22mm + 3mm padding
          yPosition += 4; // Move down for next line
        }
        
        // Add address if available
        if (verification.merchantAddress) {
          pdf.setFont("helvetica", "normal");
          
          // Parse address lines (handle commas and line breaks)
          const addressLines = verification.merchantAddress
            .replace(/\r\n/g, '\n')
            .replace(/\n/g, '|')
            .replace(/,\s*/g, '|')
            .split('|')
            .filter(line => line.trim().length > 0);
          
          // Add each line of the address
          addressLines.forEach((line, index) => {
            const currentY = yPosition + (index * 3.5);
            if (currentY < 83) { // Stay within address area height (60mm + 25.5mm - 2.5mm padding)
              pdf.text(line.trim(), 25, currentY); // 22mm + 3mm padding
            }
          });
        }
      }

      // Clean up
      document.body.removeChild(pdfContainer);

      // Download the PDF
      pdf.save(`attestation-${verification.id}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  return (
    <div className="space-y-4">
      {/* PDF Content Preview (hidden) */}
      <div ref={pdfContentRef} className="hidden">
        <div className="bg-white p-8 font-sans">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Proof of Place Attestation
            </h1>
            <p className="text-gray-600">
              Nostr-based attestation of Proof of Place
            </p>
          </div>

          <div className="flex items-center justify-between my-8">
            {/* Sender */}
            <div className="text-center flex-1">
              <UserProfile
                npub={senderNpub}
                showFull
                size="lg"
                className="flex-col"
              />
            </div>

            {/* Arrow */}
            <div className="flex-0 text-gray-400 mx-4">
              <ArrowRight className="h-6 w-6" />
            </div>

            {/* QR Code */}
            <div className="text-center flex-1">
              <QRCode
                data={verificationUrl}
                size={150}
                className="mx-auto mb-4"
              />
              <p className="text-xs text-gray-500 break-all">
                {verificationUrl}
              </p>
            </div>

            {/* Arrow */}
            <div className="flex-0 text-gray-400 mx-4">
              <ArrowRight className="h-6 w-6" />
            </div>

            {/* Recipient */}
            <div className="text-center flex-1">
              <UserProfile
                npub={verification.recipientNpub}
                showFull
                size="lg"
                className="flex-col"
              />
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
