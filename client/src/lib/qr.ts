// QR Code generation utilities using QRCode.js
import QRCode from 'qrcode';

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

export async function generateQRCode(
  data: string, 
  options: QRCodeOptions = {}
): Promise<string> {
  const defaultOptions = {
    width: 200,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    ...options
  };

  try {
    return await QRCode.toDataURL(data, defaultOptions);
  } catch (error) {
    console.error('QR Code generation failed:', error);
    throw new Error('Failed to generate QR code');
  }
}

export async function generateQRCodeCanvas(
  data: string, 
  canvas: HTMLCanvasElement,
  options: QRCodeOptions = {}
): Promise<void> {
  const defaultOptions = {
    width: 200,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    ...options
  };

  try {
    await QRCode.toCanvas(canvas, data, defaultOptions);
  } catch (error) {
    console.error('QR Code canvas generation failed:', error);
    throw new Error('Failed to generate QR code on canvas');
  }
}

export function downloadQRCode(dataUrl: string, filename: string = 'qr-code.png') {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function printQRCode(dataUrl: string) {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code</title>
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              min-height: 100vh; 
            }
            img { 
              max-width: 100%; 
              height: auto; 
            }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" alt="QR Code" />
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }
}
