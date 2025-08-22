import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import { Printer, Download, Upload, Eye, Settings, Copy, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface LabelData {
  selectedInventoryId: string;
  productName: string;
  productCode: string;
  price: string;
  qrContent: string;
  customMessage: string;
  sizeIndicator: string;
  logoUrl: string;
  showQR: boolean;
  showLogo: boolean;
  showPrice: boolean;
  showMessage: boolean;
  showSize: boolean;
}

const defaultLabelData: LabelData = {
  selectedInventoryId: "",
  productName: "Product Name",
  productCode: "PRD-001",
  price: "25.00",
  qrContent: "PRD-001",
  customMessage: "Thank you for your purchase",
  sizeIndicator: "M",
  logoUrl: "",
  showQR: true,
  showLogo: false,
  showPrice: true,
  showMessage: true,
  showSize: true,
};

export default function LabelDesigner() {
  const [labelData, setLabelData] = useState<LabelData>(defaultLabelData);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [labelCount, setLabelCount] = useState(10); // Standard Avery 94207 sheet
  const [showInventoryDropdown, setShowInventoryDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Fetch inventory items
  const { data: inventoryItems } = useQuery({
    queryKey: ["/api/inventory"],
  });

  // Generate QR code when content changes
  useEffect(() => {
    if (labelData.showQR && labelData.qrContent) {
      generateQRCode();
    }
  }, [labelData.qrContent, labelData.showQR]);

  const generateQRCode = async () => {
    try {
      const url = await QRCode.toDataURL(labelData.qrContent, {
        width: 120,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLabelData(prev => ({
          ...prev,
          logoUrl: e.target?.result as string,
          showLogo: true
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const updateLabelData = (field: keyof LabelData, value: string | boolean) => {
    setLabelData(prev => ({ ...prev, [field]: value }));
  };

  const handleInventorySelect = (inventoryItem: any) => {
    setLabelData(prev => ({
      ...prev,
      selectedInventoryId: inventoryItem.id,
      productName: inventoryItem.name,
      productCode: inventoryItem.sku,
      price: inventoryItem.price.toString(),
      qrContent: inventoryItem.sku,
      sizeIndicator: inventoryItem.size || "M"
    }));
    setShowInventoryDropdown(false);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const labelHTML = generateLabelHTML();
    const labelsPerSheet = Math.min(labelCount, 10); // Max 10 per Avery 94207 sheet
    const labels = Array.from({ length: labelsPerSheet }, () => labelHTML).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Avery 94207 Labels</title>
          <style>
            @page {
              size: 8.5in 11in;
              margin: 0.5in;
            }
            @media print {
              body { margin: 0; }
              .label-sheet { page-break-after: always; }
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
            }
            .label-sheet {
              display: grid;
              grid-template-columns: 1fr 1fr;
              grid-template-rows: repeat(5, 1fr);
              gap: 0.125in;
              width: 7.5in;
              height: 10in;
              margin: 0 auto;
            }
            .label {
              width: 4in;
              height: 2in;
              border: 1px dashed #ccc;
              position: relative;
              padding: 0.1in;
              box-sizing: border-box;
              page-break-inside: avoid;
            }
            .label-content {
              width: 100%;
              height: 100%;
              display: grid;
              grid-template-areas:
                "product-info qr-code"
                "logo size"
                "message message";
              grid-template-columns: 1fr 1.2in;
              grid-template-rows: 1fr auto 0.4in;
              gap: 0.05in;
            }
            .product-info {
              grid-area: product-info;
              display: flex;
              flex-direction: column;
              justify-content: flex-start;
            }
            .product-name {
              font-size: 14px;
              font-weight: bold;
              margin: 0 0 2px 0;
              line-height: 1.1;
            }
            .product-code {
              font-size: 10px;
              margin: 0 0 4px 0;
              color: #666;
            }
            .price {
              font-size: 18px;
              font-weight: bold;
              margin: 0;
            }
            .qr-code {
              grid-area: qr-code;
              display: flex;
              align-items: flex-start;
              justify-content: center;
            }
            .qr-code img {
              max-width: 1in;
              max-height: 1in;
            }
            .logo {
              grid-area: logo;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .logo img {
              max-width: 0.8in;
              max-height: 0.6in;
              object-fit: contain;
            }
            .size-indicator {
              grid-area: size;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 24px;
              font-weight: bold;
            }
            .message {
              grid-area: message;
              font-size: 8px;
              text-align: center;
              display: flex;
              align-items: center;
              justify-content: center;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <div class="label-sheet">
            ${labels}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const generateLabelHTML = () => {
    return `
      <div class="label">
        <div class="label-content">
          <div class="product-info">
            <div class="product-name">${labelData.productName}</div>
            <div class="product-code">${labelData.productCode}</div>
            ${labelData.showPrice ? `<div class="price">$${labelData.price}</div>` : ''}
          </div>
          ${labelData.showQR ? `<div class="qr-code"><img src="${qrCodeUrl}" /></div>` : ''}
          ${labelData.showLogo && labelData.logoUrl ? `<div class="logo"><img src="${labelData.logoUrl}" /></div>` : ''}
          ${labelData.showSize ? `<div class="size-indicator">${labelData.sizeIndicator}</div>` : ''}
          ${labelData.showMessage ? `<div class="message">${labelData.customMessage}</div>` : ''}
        </div>
      </div>
    `;
  };

  const duplicateLabel = () => {
    const newData = { ...labelData };
    navigator.clipboard.writeText(JSON.stringify(newData));
    toast({
      title: "Label Copied",
      description: "Label configuration copied to clipboard",
      duration: 2000,
    });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Avery 94207 Label Designer</h1>
        <p className="text-muted-foreground">
          Design and print custom labels (2" × 4") with QR codes, logos, and custom text
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Label Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Label Preview
            </CardTitle>
            <CardDescription>
              Preview of your Avery 94207 label (2" × 4")
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center mb-4">
              <div 
                className="border-2 border-dashed border-gray-300 bg-white p-2"
                style={{
                  width: '288px', // 4 inches at 72 DPI
                  height: '144px', // 2 inches at 72 DPI
                  position: 'relative'
                }}
              >
                <div 
                  className="w-full h-full grid gap-1"
                  style={{
                    gridTemplateAreas: `
                      "product-info qr-code"
                      "logo size"
                      "message message"
                    `,
                    gridTemplateColumns: '1fr 86px',
                    gridTemplateRows: '1fr auto 28px'
                  }}
                >
                  {/* Product Info */}
                  <div style={{ gridArea: 'product-info' }} className="flex flex-col justify-start">
                    <div className="text-sm font-bold leading-tight mb-1">{labelData.productName}</div>
                    <div className="text-xs text-gray-600 mb-1">{labelData.productCode}</div>
                    {labelData.showPrice && (
                      <div className="text-lg font-bold">${labelData.price}</div>
                    )}
                  </div>

                  {/* QR Code */}
                  {labelData.showQR && qrCodeUrl && (
                    <div style={{ gridArea: 'qr-code' }} className="flex items-start justify-center">
                      <img src={qrCodeUrl} className="w-16 h-16" />
                    </div>
                  )}

                  {/* Logo */}
                  {labelData.showLogo && labelData.logoUrl && (
                    <div style={{ gridArea: 'logo' }} className="flex items-center justify-center">
                      <img src={labelData.logoUrl} className="max-w-12 max-h-10 object-contain" />
                    </div>
                  )}

                  {/* Size Indicator */}
                  {labelData.showSize && (
                    <div style={{ gridArea: 'size' }} className="flex items-center justify-center text-xl font-bold">
                      {labelData.sizeIndicator}
                    </div>
                  )}

                  {/* Message */}
                  {labelData.showMessage && (
                    <div style={{ gridArea: 'message' }} className="flex items-center justify-center text-xs text-center italic">
                      {labelData.customMessage}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Print Controls */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="label-count">Labels per sheet (max 10)</Label>
                <Input
                  id="label-count"
                  type="number"
                  min="1"
                  max="10"
                  value={labelCount}
                  onChange={(e) => setLabelCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-24"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handlePrint} className="flex-1">
                  <Printer className="h-4 w-4 mr-2" />
                  Print Labels
                </Button>
                <Button variant="outline" onClick={duplicateLabel}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customization Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Customize Label
            </CardTitle>
            <CardDescription>
              Configure text, images, and QR code content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="media">Media</TabsTrigger>
                <TabsTrigger value="layout">Layout</TabsTrigger>
              </TabsList>

              {/* Content Tab */}
              <TabsContent value="content" className="space-y-4">
                <div>
                  <Label htmlFor="inventory-select">Select Inventory Item</Label>
                  <Popover open={showInventoryDropdown} onOpenChange={setShowInventoryDropdown}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={showInventoryDropdown}
                        className="w-full justify-between"
                        data-testid="button-select-inventory"
                      >
                        {labelData.selectedInventoryId
                          ? (inventoryItems as any[] || []).find((item: any) => item.id === labelData.selectedInventoryId)?.name
                          : "Select inventory item..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search inventory..." className="h-9" />
                        <CommandList>
                          <CommandEmpty>No inventory items found.</CommandEmpty>
                          <CommandGroup>
                            {(inventoryItems as any[] || []).map((item: any) => (
                              <CommandItem
                                key={item.id}
                                value={item.name}
                                onSelect={() => handleInventorySelect(item)}
                                data-testid={`inventory-item-${item.id}`}
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">{item.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {item.sku} - ${item.price}
                                  </span>
                                </div>
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    labelData.selectedInventoryId === item.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor="product-name">Product Name</Label>
                  <Input
                    id="product-name"
                    value={labelData.productName}
                    onChange={(e) => updateLabelData('productName', e.target.value)}
                    placeholder="Enter product name"
                  />
                </div>
                <div>
                  <Label htmlFor="product-code">Product Code</Label>
                  <Input
                    id="product-code"
                    value={labelData.productCode}
                    onChange={(e) => updateLabelData('productCode', e.target.value)}
                    placeholder="Enter product code"
                  />
                </div>
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    value={labelData.price}
                    onChange={(e) => updateLabelData('price', e.target.value)}
                    placeholder="25.00"
                  />
                </div>
                <div>
                  <Label htmlFor="qr-content">QR Code Content</Label>
                  <Input
                    id="qr-content"
                    value={labelData.qrContent}
                    onChange={(e) => updateLabelData('qrContent', e.target.value)}
                    placeholder="Enter QR code content"
                  />
                </div>
                <div>
                  <Label htmlFor="size-indicator">Size Indicator</Label>
                  <Select 
                    value={labelData.sizeIndicator} 
                    onValueChange={(value) => updateLabelData('sizeIndicator', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="XS">XS</SelectItem>
                      <SelectItem value="S">S</SelectItem>
                      <SelectItem value="M">M</SelectItem>
                      <SelectItem value="L">L</SelectItem>
                      <SelectItem value="XL">XL</SelectItem>
                      <SelectItem value="XXL">XXL</SelectItem>
                      <SelectItem value="OS">OS (One Size)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="custom-message">Custom Message</Label>
                  <Textarea
                    id="custom-message"
                    value={labelData.customMessage}
                    onChange={(e) => updateLabelData('customMessage', e.target.value)}
                    placeholder="Enter custom message"
                    rows={3}
                  />
                </div>
              </TabsContent>

              {/* Media Tab */}
              <TabsContent value="media" className="space-y-4">
                <div>
                  <Label htmlFor="logo-upload">Logo Upload</Label>
                  <div className="mt-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                    </Button>
                  </div>
                  {labelData.logoUrl && (
                    <div className="mt-2 p-2 border rounded">
                      <img src={labelData.logoUrl} className="max-w-20 max-h-16 object-contain" />
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Layout Tab */}
              <TabsContent value="layout" className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-qr">Show QR Code</Label>
                    <Switch
                      id="show-qr"
                      checked={labelData.showQR}
                      onCheckedChange={(checked) => updateLabelData('showQR', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-logo">Show Logo</Label>
                    <Switch
                      id="show-logo"
                      checked={labelData.showLogo}
                      onCheckedChange={(checked) => updateLabelData('showLogo', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-price">Show Price</Label>
                    <Switch
                      id="show-price"
                      checked={labelData.showPrice}
                      onCheckedChange={(checked) => updateLabelData('showPrice', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-message">Show Message</Label>
                    <Switch
                      id="show-message"
                      checked={labelData.showMessage}
                      onCheckedChange={(checked) => updateLabelData('showMessage', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-size">Show Size</Label>
                    <Switch
                      id="show-size"
                      checked={labelData.showSize}
                      onCheckedChange={(checked) => updateLabelData('showSize', checked)}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}