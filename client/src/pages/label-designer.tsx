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

interface ElementPosition {
  x: number;
  y: number;
}

interface LabelLayout {
  productInfo: ElementPosition;
  qrCode: ElementPosition;
  logo: ElementPosition;
  sizeIndicator: ElementPosition;
  message: ElementPosition;
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
  // Load saved data from localStorage or use defaults with error handling
  const [labelData, setLabelData] = useState<LabelData>(() => {
    try {
      const saved = localStorage.getItem('labelDesignerData');
      return saved ? { ...defaultLabelData, ...JSON.parse(saved) } : defaultLabelData;
    } catch (error) {
      console.warn('Failed to load saved label data:', error);
      return defaultLabelData;
    }
  });
  
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [labelCount, setLabelCount] = useState(() => {
    try {
      const saved = localStorage.getItem('labelDesignerCount');
      return saved ? parseInt(saved) : 10;
    } catch (error) {
      console.warn('Failed to load saved label count:', error);
      return 10;
    }
  });
  const [showInventoryDropdown, setShowInventoryDropdown] = useState(false);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load saved layout or use defaults with error handling
  const [layout, setLayout] = useState<LabelLayout>(() => {
    try {
      const saved = localStorage.getItem('labelDesignerLayout');
      return saved ? JSON.parse(saved) : {
        productInfo: { x: 5, y: 10 },
        qrCode: { x: 70, y: 5 },
        logo: { x: 5, y: 55 },
        sizeIndicator: { x: 75, y: 55 },
        message: { x: 10, y: 80 }
      };
    } catch (error) {
      console.warn('Failed to load saved layout:', error);
      return {
        productInfo: { x: 5, y: 10 },
        qrCode: { x: 70, y: 5 },
        logo: { x: 5, y: 55 },
        sizeIndicator: { x: 75, y: 55 },
        message: { x: 10, y: 80 }
      };
    }
  });

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

  // Save label data to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('labelDesignerData', JSON.stringify(labelData));
    } catch (error) {
      console.warn('Failed to save label data:', error);
    }
  }, [labelData]);

  // Save layout to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('labelDesignerLayout', JSON.stringify(layout));
    } catch (error) {
      console.warn('Failed to save layout:', error);
    }
  }, [layout]);

  // Save label count to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('labelDesignerCount', labelCount.toString());
    } catch (error) {
      console.warn('Failed to save label count:', error);
    }
  }, [labelCount]);

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
              position: relative;
            }
            .product-info {
              position: absolute;
              display: flex;
              flex-direction: column;
              justify-content: flex-start;
              max-width: 45%;
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
              position: absolute;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .qr-code img {
              max-width: 1in;
              max-height: 1in;
            }
            .logo {
              position: absolute;
              display: flex;
              align-items: center;
              justify-content: center;
              width: 0.8in;
              height: 0.6in;
            }
            .logo img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }
            .size-indicator {
              position: absolute;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 24px;
              font-weight: bold;
              min-width: 0.6in;
              min-height: 0.6in;
            }
            .message {
              position: absolute;
              font-size: 8px;
              text-align: center;
              display: flex;
              align-items: center;
              justify-content: center;
              font-style: italic;
              max-width: 80%;
              white-space: pre-wrap;
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
    // Convert percentages to inches (4in width, 2in height after padding)
    const labelWidth = 3.8; // 4in - 0.2in padding
    const labelHeight = 1.8; // 2in - 0.2in padding
    
    const convertPosition = (percentage: number, dimension: number) => {
      return (percentage / 100) * dimension;
    };
    
    return `
      <div class="label">
        <div class="label-content">
          <div class="product-info" style="left: ${convertPosition(layout.productInfo.x, labelWidth)}in; top: ${convertPosition(layout.productInfo.y, labelHeight)}in;">
            <div class="product-name">${labelData.productName}</div>
            <div class="product-code">${labelData.productCode}</div>
            ${labelData.showPrice ? `<div class="price">$${labelData.price}</div>` : ''}
          </div>
          ${labelData.showQR ? `<div class="qr-code" style="left: ${convertPosition(layout.qrCode.x, labelWidth)}in; top: ${convertPosition(layout.qrCode.y, labelHeight)}in;"><img src="${qrCodeUrl}" /></div>` : ''}
          ${labelData.showLogo && labelData.logoUrl ? `<div class="logo" style="left: ${convertPosition(layout.logo.x, labelWidth)}in; top: ${convertPosition(layout.logo.y, labelHeight)}in;"><img src="${labelData.logoUrl}" /></div>` : ''}
          ${labelData.showSize ? `<div class="size-indicator" style="left: ${convertPosition(layout.sizeIndicator.x, labelWidth)}in; top: ${convertPosition(layout.sizeIndicator.y, labelHeight)}in;">${labelData.sizeIndicator}</div>` : ''}
          ${labelData.showMessage ? `<div class="message" style="left: ${convertPosition(layout.message.x, labelWidth)}in; top: ${convertPosition(layout.message.y, labelHeight)}in;">${labelData.customMessage}</div>` : ''}
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

  const handleMouseDown = (elementId: string, e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(elementId);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
    const y = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;
    
    // Constrain to container bounds
    const constrainedX = Math.max(0, Math.min(85, x));
    const constrainedY = Math.max(0, Math.min(85, y));
    
    setLayout(prev => ({
      ...prev,
      [isDragging]: { x: constrainedX, y: constrainedY }
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(null);
    setDragOffset({ x: 0, y: 0 });
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
                className="border-2 border-dashed border-gray-300 bg-white p-2 cursor-pointer select-none"
                style={{
                  width: '480px', // Larger: 6.67 inches at 72 DPI
                  height: '240px', // Larger: 3.33 inches at 72 DPI (maintaining 2:1 ratio)
                  position: 'relative'
                }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Product Info */}
                <div 
                  className={`absolute flex flex-col justify-start cursor-move p-2 rounded border-2 transition-all ${
                    isDragging === 'productInfo' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-gray-400'
                  }`}
                  style={{
                    left: `${layout.productInfo.x}%`,
                    top: `${layout.productInfo.y}%`,
                    maxWidth: '45%'
                  }}
                  onMouseDown={(e) => handleMouseDown('productInfo', e)}
                >
                  <div className="text-lg font-bold leading-tight mb-1">{labelData.productName}</div>
                  <div className="text-sm text-gray-600 mb-1">{labelData.productCode}</div>
                  {labelData.showPrice && (
                    <div className="text-2xl font-bold">${labelData.price}</div>
                  )}
                </div>

                {/* QR Code */}
                {labelData.showQR && qrCodeUrl && (
                  <div 
                    className={`absolute cursor-move p-1 rounded border-2 transition-all ${
                      isDragging === 'qrCode' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-gray-400'
                    }`}
                    style={{
                      left: `${layout.qrCode.x}%`,
                      top: `${layout.qrCode.y}%`
                    }}
                    onMouseDown={(e) => handleMouseDown('qrCode', e)}
                  >
                    <img src={qrCodeUrl} className="w-20 h-20" />
                  </div>
                )}

                {/* Logo */}
                {labelData.showLogo && labelData.logoUrl && (
                  <div 
                    className={`absolute cursor-move p-1 rounded border-2 transition-all flex items-center justify-center ${
                      isDragging === 'logo' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-gray-400'
                    }`}
                    style={{
                      left: `${layout.logo.x}%`,
                      top: `${layout.logo.y}%`,
                      width: '60px',
                      height: '50px'
                    }}
                    onMouseDown={(e) => handleMouseDown('logo', e)}
                  >
                    <img src={labelData.logoUrl} className="max-w-full max-h-full object-contain" />
                  </div>
                )}

                {/* Size Indicator */}
                {labelData.showSize && (
                  <div 
                    className={`absolute cursor-move p-2 rounded border-2 transition-all flex items-center justify-center text-3xl font-bold ${
                      isDragging === 'sizeIndicator' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-gray-400'
                    }`}
                    style={{
                      left: `${layout.sizeIndicator.x}%`,
                      top: `${layout.sizeIndicator.y}%`,
                      minWidth: '50px',
                      minHeight: '50px'
                    }}
                    onMouseDown={(e) => handleMouseDown('sizeIndicator', e)}
                  >
                    {labelData.sizeIndicator}
                  </div>
                )}

                {/* Message */}
                {labelData.showMessage && (
                  <div 
                    className={`absolute cursor-move p-2 rounded border-2 transition-all flex items-center justify-center text-sm text-center italic ${
                      isDragging === 'message' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-gray-400'
                    }`}
                    style={{
                      left: `${layout.message.x}%`,
                      top: `${layout.message.y}%`,
                      maxWidth: '80%',
                      whiteSpace: 'pre-wrap'
                    }}
                    onMouseDown={(e) => handleMouseDown('message', e)}
                  >
                    {labelData.customMessage}
                  </div>
                )}

                {/* Helper text */}
                <div className="absolute bottom-2 right-2 text-xs text-gray-400 pointer-events-none">
                  Drag elements to reposition
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
                  <Label htmlFor="product-code">Product SKU</Label>
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