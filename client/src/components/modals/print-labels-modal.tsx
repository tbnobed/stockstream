import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Printer } from "lucide-react";
import QRLabel from "@/components/qr-label";

interface PrintLabelsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PrintLabelsModal({ open, onOpenChange }: PrintLabelsModalProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [labelSize, setLabelSize] = useState("medium");
  const [copies, setCopies] = useState(1);

  const { data: inventoryItems } = useQuery({
    queryKey: ["/api/inventory"],
  });

  const handleItemSelection = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, itemId]);
    } else {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    }
  };

  const handlePrint = () => {
    if (selectedItems.length === 0) return;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const selectedItemsData = inventoryItems?.filter((item: any) => 
      selectedItems.includes(item.id)
    ) || [];

    // Generate HTML for printing
    let printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Code Labels</title>
        <style>
          @page { 
            size: ${labelSize === 'small' ? '1in 1in' : labelSize === 'large' ? '2in 2in' : '1.5in 1.5in'}; 
            margin: 0.1in; 
          }
          body { 
            margin: 0; 
            padding: 0; 
            font-family: Arial, sans-serif; 
          }
          .label { 
            width: 100%; 
            height: 100%; 
            page-break-after: always; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            text-align: center;
            padding: 0.1in;
            box-sizing: border-box;
          }
          .label:last-child { 
            page-break-after: avoid; 
          }
          .qr-code { 
            margin-bottom: 0.1in; 
          }
          .item-info { 
            font-size: ${labelSize === 'small' ? '6px' : labelSize === 'large' ? '10px' : '8px'}; 
            line-height: 1.2;
          }
          .sku { 
            font-family: monospace; 
            font-weight: bold; 
          }
          .name { 
            margin: 2px 0; 
          }
          .price { 
            font-weight: bold; 
          }
        </style>
      </head>
      <body>
    `;

    selectedItemsData.forEach((item: any) => {
      for (let copy = 0; copy < copies; copy++) {
        printContent += `
          <div class="label">
            <div class="qr-code">
              <canvas id="qr-${item.id}-${copy}" width="60" height="60"></canvas>
            </div>
            <div class="item-info">
              <div class="sku">${item.sku}</div>
              <div class="name">${item.name}</div>
              <div class="price">$${Number(item.price).toFixed(2)}</div>
            </div>
          </div>
        `;
      }
    });

    printContent += '</body></html>';
    
    printWindow.document.write(printContent);
    printWindow.document.close();

    // Generate QR codes after DOM is ready
    printWindow.onload = () => {
      selectedItemsData.forEach((item: any) => {
        for (let copy = 0; copy < copies; copy++) {
          const canvas = printWindow.document.getElementById(`qr-${item.id}-${copy}`) as HTMLCanvasElement;
          if (canvas) {
            // You would implement QR code generation here
            // For now, we'll just draw a placeholder
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#000';
              ctx.fillRect(0, 0, 60, 60);
              ctx.fillStyle = '#fff';
              ctx.font = '8px monospace';
              ctx.textAlign = 'center';
              ctx.fillText('QR', 30, 32);
            }
          }
        }
      });
      
      // Print after a short delay
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };

    onOpenChange(false);
  };

  const previewItem = inventoryItems?.find((item: any) => selectedItems.includes(item.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Print QR Code Labels
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              data-testid="button-close-labels-modal"
            >
              <X size={16} />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Label Configuration */}
          <div>
            <h4 className="font-medium text-secondary mb-4">Label Configuration</h4>
            <div className="space-y-4">
              <div>
                <Label htmlFor="items-select" className="text-sm font-medium text-secondary mb-2">
                  Select Items
                </Label>
                <div className="border border-border rounded-lg h-32 overflow-y-auto p-2">
                  {inventoryItems?.map((item: any) => (
                    <div key={item.id} className="flex items-center space-x-2 p-1">
                      <input
                        type="checkbox"
                        id={`item-${item.id}`}
                        checked={selectedItems.includes(item.id)}
                        onChange={(e) => handleItemSelection(item.id, e.target.checked)}
                        className="text-primary focus:ring-primary"
                        data-testid={`checkbox-item-${item.id}`}
                      />
                      <label htmlFor={`item-${item.id}`} className="text-sm text-secondary flex-1">
                        {item.sku} - {item.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <Label htmlFor="label-size" className="text-sm font-medium text-secondary mb-2">
                  Label Size
                </Label>
                <Select value={labelSize} onValueChange={setLabelSize}>
                  <SelectTrigger data-testid="select-label-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small (1" x 1")</SelectItem>
                    <SelectItem value="medium">Medium (1.5" x 1.5")</SelectItem>
                    <SelectItem value="large">Large (2" x 2")</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="copies" className="text-sm font-medium text-secondary mb-2">
                  Copies per Item
                </Label>
                <Input
                  id="copies"
                  type="number"
                  min="1"
                  max="10"
                  value={copies}
                  onChange={(e) => setCopies(Number(e.target.value))}
                  data-testid="input-copies"
                />
              </div>
            </div>
          </div>
          
          {/* Label Preview */}
          <div>
            <h4 className="font-medium text-secondary mb-4">Label Preview</h4>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-muted/20">
              {previewItem ? (
                <QRLabel item={previewItem} size={labelSize} />
              ) : (
                <div className="text-muted-foreground">
                  Select an item to see preview
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-print"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handlePrint}
            disabled={selectedItems.length === 0}
            data-testid="button-print-labels"
          >
            <Printer className="mr-2" size={16} />
            Print Labels ({selectedItems.length * copies})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
