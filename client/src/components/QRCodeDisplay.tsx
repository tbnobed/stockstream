import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QRCodeDisplayProps {
  url: string;
  title?: string;
  description?: string;
  showUrl?: boolean;
  className?: string;
}

export function QRCodeDisplay({ 
  url, 
  title = "QR Code", 
  description, 
  showUrl = true,
  className 
}: QRCodeDisplayProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const qrDataUrl = await QRCode.toDataURL(url, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
        setQrCodeUrl(qrDataUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };

    if (url) {
      generateQRCode();
    }
  }, [url]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Receipt URL copied to clipboard",
        duration: 2000,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy URL to clipboard",
        variant: "destructive",
      });
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `receipt-qr-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Downloaded!",
      description: "QR code saved to your device",
      duration: 2000,
    });
  };

  if (!qrCodeUrl) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-lg p-8">
        <div className="text-center text-gray-500">Generating QR code...</div>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="text-center">
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && (
          <p className="text-sm text-gray-600">{description}</p>
        )}
      </CardHeader>
      <CardContent className="text-center space-y-4">
        {/* QR Code Image */}
        <div className="flex justify-center">
          <img 
            src={qrCodeUrl} 
            alt="QR Code" 
            className="border border-gray-200 rounded-lg"
          />
        </div>

        {/* URL Display */}
        {showUrl && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-2">Receipt URL:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white px-2 py-1 rounded border truncate">
                {url}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={copyToClipboard}
                className="shrink-0"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 justify-center">
          <Button
            size="sm"
            variant="outline"
            onClick={copyToClipboard}
            className="flex items-center gap-2"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied!" : "Copy URL"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={downloadQRCode}
            className="flex items-center gap-2"
          >
            <Download size={14} />
            Download QR
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          Customer can scan this QR code to view their digital receipt
        </p>
      </CardContent>
    </Card>
  );
}