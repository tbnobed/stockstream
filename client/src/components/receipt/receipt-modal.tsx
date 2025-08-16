import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Printer, Download } from "lucide-react";
import { useRef } from "react";

interface ReceiptModalProps {
  sale: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ReceiptModal({ sale, open, onOpenChange }: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!sale) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${sale.orderNumber}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.4;
              margin: 0;
              padding: 20px;
              background: white;
            }
            .receipt {
              max-width: 300px;
              margin: 0 auto;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .separator {
              border-top: 1px dashed #000;
              margin: 10px 0;
            }
            .row {
              display: flex;
              justify-content: space-between;
              margin: 2px 0;
            }
            .total-row {
              font-weight: bold;
              font-size: 14px;
              margin-top: 10px;
            }
            @media print {
              body { margin: 0; padding: 0; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    // Small delay to ensure content is loaded before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleDownload = () => {
    const receiptText = `
INVENTORYPRO
Sales Receipt
${'-'.repeat(32)}

Order #: ${sale.orderNumber}
Date: ${formatDate(sale.saleDate)}
Associate: ${sale.salesAssociate?.name || 'Unknown'}

${'-'.repeat(32)}
ITEM DETAILS
${'-'.repeat(32)}

${sale.item?.name || 'Unknown Item'}
SKU: ${sale.item?.sku || 'N/A'}
${sale.item?.type ? `Type: ${sale.item.type}` : ''}
${sale.item?.size ? `Size: ${sale.item.size}` : ''}
${sale.item?.color ? `Color: ${sale.item.color}` : ''}

Qty: ${sale.quantity}
Unit Price: ${formatCurrency(Number(sale.unitPrice) || 0)}

${'-'.repeat(32)}
PAYMENT
${'-'.repeat(32)}

Method: ${sale.paymentMethod?.toUpperCase() || 'UNKNOWN'}
Total: ${formatCurrency(Number(sale.totalAmount) || 0)}

${'-'.repeat(32)}

Thank you for your purchase!

Generated: ${new Date().toLocaleString()}
    `.trim();

    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${sale.orderNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" data-testid="modal-receipt">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            Receipt
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Receipt Content */}
          <div 
            ref={receiptRef} 
            className="bg-white text-black p-4 border rounded-lg font-mono text-sm receipt-content"
          >
            <div className="space-y-2">
              {/* Header */}
              <div className="text-center space-y-1">
                <div className="font-bold text-lg">INVENTORYPRO</div>
                <div className="text-sm">Sales Receipt</div>
                <div className="border-b border-dashed border-gray-400 my-2"></div>
              </div>

              {/* Order Info */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Order #:</span>
                  <span className="font-bold">{sale.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{formatDate(sale.saleDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Associate:</span>
                  <span>{sale.salesAssociate?.name || 'Unknown'}</span>
                </div>
              </div>

              <div className="border-b border-dashed border-gray-400 my-2"></div>

              {/* Item Details */}
              <div className="space-y-1">
                <div className="font-bold text-center">ITEM DETAILS</div>
                <div className="border-b border-dashed border-gray-400 my-1"></div>
                
                <div className="font-bold">{sale.item?.name || 'Unknown Item'}</div>
                <div>SKU: {sale.item?.sku || 'N/A'}</div>
                {sale.item?.type && <div>Type: {sale.item.type}</div>}
                {sale.item?.size && <div>Size: {sale.item.size}</div>}
                {sale.item?.color && <div>Color: {sale.item.color}</div>}
                
                <div className="flex justify-between mt-2">
                  <span>Qty:</span>
                  <span>{sale.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span>Unit Price:</span>
                  <span>{formatCurrency(Number(sale.unitPrice) || 0)}</span>
                </div>
              </div>

              <div className="border-b border-dashed border-gray-400 my-2"></div>

              {/* Payment */}
              <div className="space-y-1">
                <div className="font-bold text-center">PAYMENT</div>
                <div className="border-b border-dashed border-gray-400 my-1"></div>
                
                <div className="flex justify-between">
                  <span>Method:</span>
                  <span>{sale.paymentMethod?.toUpperCase() || 'UNKNOWN'}</span>
                </div>
                <div className="flex justify-between font-bold text-lg mt-2">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(Number(sale.totalAmount) || 0)}</span>
                </div>
              </div>

              <div className="border-b border-dashed border-gray-400 my-2"></div>

              {/* Footer */}
              <div className="text-center text-xs">
                <div>Thank you for your purchase!</div>
                <div className="mt-2 text-gray-600">
                  Generated: {new Date().toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handlePrint}
              className="flex-1"
              data-testid="button-print-receipt"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex-1"
              data-testid="button-download-receipt"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}