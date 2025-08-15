import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import QRCode from "qrcode";
import { Printer, Download } from "lucide-react";

interface PrintLabelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    id: string;
    name: string;
    sku: string;
    price: number;
  } | null;
}

export default function PrintLabelModal({ open, onOpenChange, item }: PrintLabelModalProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [labelCount, setLabelCount] = useState(1);

  if (!item) return null;

  const generateQRCode = async () => {
    try {
      // Create QR code data with item information
      const qrData = JSON.stringify({
        id: item.id,
        sku: item.sku,
        name: item.name
      });
      
      const url = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrCodeUrl(url);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const handlePrintLabel = () => {
    if (!qrCodeUrl) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const labels = Array.from({ length: labelCount }, (_, index) => `
      <div style="
        width: 3in; 
        height: 2in; 
        border: 1px solid #ccc; 
        padding: 10px; 
        margin: 10px; 
        page-break-inside: avoid;
        display: inline-block;
        vertical-align: top;
        text-align: center;
      ">
        <h3 style="margin: 0 0 5px 0; font-size: 12px; font-weight: bold;">${item.name}</h3>
        <p style="margin: 0 0 5px 0; font-size: 10px;">SKU: ${item.sku}</p>
        <p style="margin: 0 0 10px 0; font-size: 11px; font-weight: bold;">$${item.price.toFixed(2)}</p>
        <img src="${qrCodeUrl}" style="width: 80px; height: 80px;" />
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Labels - ${item.name}</title>
          <style>
            @media print {
              @page { margin: 0.5in; }
              body { margin: 0; font-family: Arial, sans-serif; }
            }
            body { font-family: Arial, sans-serif; }
          </style>
        </head>
        <body>
          ${labels}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleDownloadQR = () => {
    if (!qrCodeUrl) return;

    const link = document.createElement('a');
    link.download = `${item.sku}-qr-code.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  // Generate QR code when modal opens
  if (open && !qrCodeUrl) {
    generateQRCode();
  }

  // Reset QR code when modal closes
  if (!open && qrCodeUrl) {
    setQrCodeUrl("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Print Labels - {item.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground mb-2">Preview</p>
              <div className="border border-dashed border-muted p-4 inline-block bg-white">
                <h3 className="font-bold text-sm mb-1">{item.name}</h3>
                <p className="text-xs text-muted-foreground mb-1">SKU: {item.sku}</p>
                <p className="text-sm font-bold mb-2">${item.price.toFixed(2)}</p>
                {qrCodeUrl && (
                  <img src={qrCodeUrl} alt="QR Code" className="w-16 h-16 mx-auto" />
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-2">
            <Label htmlFor="labelCount">Number of Labels</Label>
            <Input
              id="labelCount"
              type="number"
              min="1"
              max="50"
              value={labelCount}
              onChange={(e) => setLabelCount(Math.max(1, parseInt(e.target.value) || 1))}
              data-testid="input-label-count"
            />
          </div>

          <div className="flex space-x-2">
            <Button 
              onClick={handlePrintLabel} 
              disabled={!qrCodeUrl}
              className="flex-1"
              data-testid="button-print-labels"
            >
              <Printer size={16} className="mr-2" />
              Print {labelCount} Label{labelCount !== 1 ? 's' : ''}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDownloadQR}
              disabled={!qrCodeUrl}
              data-testid="button-download-qr"
            >
              <Download size={16} className="mr-1" />
              QR
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}