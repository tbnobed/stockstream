import { useEffect, useRef } from "react";

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

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Simple QR code placeholder - in a real app you'd use a QR code library
    const qrSize = size === "small" ? 40 : size === "large" ? 80 : 60;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw QR code placeholder (black square with white center)
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, qrSize, qrSize);
    
    // Add some white squares to simulate QR pattern
    ctx.fillStyle = '#fff';
    for (let i = 0; i < qrSize; i += 8) {
      for (let j = 0; j < qrSize; j += 8) {
        if ((i + j) % 16 === 0) {
          ctx.fillRect(i, j, 4, 4);
        }
      }
    }
    
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
