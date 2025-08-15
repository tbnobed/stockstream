import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface QRLabelProps {
  item: {
    sku: string;
    name: string;
    price: string;
  };
  size?: "small" | "medium" | "large";
}

export default function QRLabel({ item, size = "medium" }: QRLabelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const qrSize = size === "small" ? 40 : size === "large" ? 80 : 60;
    
    // Generate real QR code
    QRCode.toCanvas(canvas, item.sku, {
      width: qrSize,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    }).catch(err => {
      console.error('Error generating QR code:', err);
      // Fallback to placeholder if QR generation fails
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, qrSize, qrSize);
        ctx.fillStyle = '#fff';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('QR', qrSize/2, qrSize/2);
      }
    });
    
  }, [item.sku, size]);

  const containerSize = size === "small" ? "w-16" : size === "large" ? "w-24" : "w-20";
  const textSize = size === "small" ? "text-xs" : size === "large" ? "text-sm" : "text-xs";
  const qrSize = size === "small" ? 40 : size === "large" ? 80 : 60;

  return (
    <div className={`bg-surface p-2 rounded shadow-sm inline-block print-label ${containerSize}`}>
      <div className="text-center">
        <canvas
          ref={canvasRef}
          width={qrSize}
          height={qrSize}
          className="mx-auto mb-1"
          data-testid={`qr-code-${item.sku}`}
        />
        <div className={`${textSize} space-y-0.5`}>
          <p className="font-mono font-medium text-secondary" data-testid={`label-sku-${item.sku}`}>
            {item.sku}
          </p>
          <p className="text-muted-foreground leading-tight" data-testid={`label-name-${item.sku}`}>
            {item.name}
          </p>
          <p className="font-medium text-secondary" data-testid={`label-price-${item.sku}`}>
            ${Number(item.price).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
