import { useEffect, useRef, useState } from "react";
import { generateQRCodeCanvas } from "@/lib/qr";

interface QRCodeProps {
  data: string;
  size?: number;
  className?: string;
}

export function QRCode({ data, size = 200, className = "" }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !data) return;

    const generateQR = async () => {
      try {
        setError(null);
        await generateQRCodeCanvas(data, canvasRef.current!, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
      } catch (err) {
        setError('Failed to generate QR code');
        console.error(err);
      }
    };

    generateQR();
  }, [data, size]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded ${className}`} 
           style={{ width: size, height: size }}>
        <div className="text-center text-gray-500">
          <p className="text-sm">QR Code Error</p>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <canvas 
      ref={canvasRef} 
      className={`border border-gray-200 rounded ${className}`}
      width={size}
      height={size}
    />
  );
}
