import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import QRCode from "qrcode";

export function QRTestGenerator() {
  const [text, setText] = useState("SHI-BLA-LX-052");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  const generateQR = async () => {
    if (!text.trim()) return;
    
    setIsGenerating(true);
    try {
      const url = await QRCode.toDataURL(text, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      setQrCodeDataUrl(url);
    } catch (error) {
      console.error('Error generating QR code:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQR = () => {
    if (!qrCodeDataUrl) return;
    
    const link = document.createElement('a');
    link.download = `qr-code-${text}.png`;
    link.href = qrCodeDataUrl;
    link.click();
  };

  const commonSKUs = [
    "SHI-BLA-LX-052",
    "SHI-RED-MD-001", 
    "PAN-BLU-SM-025",
    "JAC-GRE-XL-100"
  ];

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>QR Code Generator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="qr-text">Text to encode:</Label>
          <Input
            id="qr-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter SKU or text..."
            data-testid="input-qr-text"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={generateQR} disabled={isGenerating || !text.trim()} data-testid="button-generate-qr">
            {isGenerating ? "Generating..." : "Generate QR"}
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Quick SKUs:</Label>
          <div className="flex flex-wrap gap-2">
            {commonSKUs.map(sku => (
              <Button
                key={sku}
                variant="outline"
                size="sm"
                onClick={() => setText(sku)}
                data-testid={`button-sku-${sku}`}
              >
                {sku}
              </Button>
            ))}
          </div>
        </div>

        {qrCodeDataUrl && (
          <div className="text-center space-y-2">
            <img 
              src={qrCodeDataUrl} 
              alt="Generated QR Code" 
              className="mx-auto border rounded"
              data-testid="img-qr-code"
            />
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={downloadQR} data-testid="button-download-qr">
                Download QR
              </Button>
              <Button variant="outline" onClick={() => window.print()} data-testid="button-print-qr">
                Print QR
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              QR Code for: {text}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}