import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Printer, Download, Upload, Eye, Settings, Copy, Check, ChevronsUpDown, Trash2, Plus } from "lucide-react";
import html2canvas from "html2canvas";
import { cn } from "@/lib/utils";
import { ObjectUploader } from "@/components/ObjectUploader";
import { apiRequest } from "@/lib/queryClient";
// Removed Uppy dependency
import type { MediaFile } from "@shared/schema";

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
  const [labelData, setLabelData] = useState<LabelData>(defaultLabelData);
  
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

  // Query to get default label template
  const { data: defaultTemplate } = useQuery({
    queryKey: ['/api/label-templates/default'],
    retry: false,
  });

  // Auto-save mutation
  const autoSaveMutation = useMutation({
    mutationFn: async (templateData: LabelData) => {
      if (defaultTemplate) {
        // Update existing default template
        return apiRequest('PUT', `/api/label-templates/${defaultTemplate.id}`, templateData);
      } else {
        // Create new default template
        return apiRequest('POST', '/api/label-templates', { ...templateData, isDefault: true });
      }
    },
    onError: (error) => {
      console.error('Error auto-saving label template:', error);
    },
  });

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

  // Fetch media files
  const queryClient = useQueryClient();
  const { data: mediaFiles } = useQuery<MediaFile[]>({
    queryKey: ["/api/media"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/media?category=logo");
      return response.json();
    },
  });

  // Upload media file mutation
  const uploadMediaMutation = useMutation({
    mutationFn: async (data: { fileName: string; originalName: string; fileType: string; fileSize: number; uploadURL: string }) => {
      const response = await apiRequest("POST", "/api/media", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media"] });
      toast({
        title: "Success",
        description: "Logo uploaded successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to upload logo",
        variant: "destructive",
      });
    },
  });

  // Delete media file mutation
  const deleteMediaMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/media/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media"] });
      toast({
        title: "Success", 
        description: "Logo deleted successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete logo",
        variant: "destructive",
      });
    },
  });

  // Generate QR code when content changes
  useEffect(() => {
    if (labelData.showQR && labelData.qrContent) {
      generateQRCode();
    }
  }, [labelData.qrContent, labelData.showQR]);

  // Track if template has been loaded to prevent auto-save conflicts
  const [templateLoaded, setTemplateLoaded] = useState(false);

  // Load default template data when available
  useEffect(() => {
    if (defaultTemplate && !templateLoaded) {
      console.log('Loading saved label data:', defaultTemplate);
      const templateData: LabelData = {
        selectedInventoryId: defaultTemplate.selectedInventoryId || "",
        productName: defaultTemplate.productName || "Product Name",
        productCode: defaultTemplate.productCode || "PRD-001",
        price: defaultTemplate.price || "25.00",
        qrContent: defaultTemplate.qrContent || "PRD-001",
        customMessage: defaultTemplate.customMessage || "Thank you for your purchase",
        sizeIndicator: defaultTemplate.sizeIndicator || "M",
        logoUrl: defaultTemplate.logoUrl || "",
        showQR: defaultTemplate.showQR !== undefined ? defaultTemplate.showQR : true,
        showLogo: defaultTemplate.showLogo !== undefined ? defaultTemplate.showLogo : false,
        showPrice: defaultTemplate.showPrice !== undefined ? defaultTemplate.showPrice : true,
        showMessage: defaultTemplate.showMessage !== undefined ? defaultTemplate.showMessage : true,
        showSize: defaultTemplate.showSize !== undefined ? defaultTemplate.showSize : true,
      };
      console.log('Merged label data:', templateData);
      setLabelData(templateData);
      setTemplateLoaded(true);
    }
  }, [defaultTemplate, templateLoaded]);

  // Auto-save label data to server whenever it changes (but only after template is loaded)
  useEffect(() => {
    if (!templateLoaded) return; // Don't auto-save until template is loaded
    
    const timeoutId = setTimeout(() => {
      autoSaveMutation.mutate(labelData);
    }, 2000); // 2 second delay for auto-save

    return () => clearTimeout(timeoutId);
  }, [labelData, templateLoaded]);

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

  const handleGetUploadParameters = async () => {
    try {
      const fileName = `logo-${Date.now()}.png`;
      
      const response = await apiRequest("POST", "/api/media/upload", {
        fileName,
        fileType: "image/png",
      });
      const data = await response.json();
      
      return {
        method: "PUT" as const,
        url: data.url || data.uploadURL,
      };
    } catch (error) {
      console.error("Error getting upload parameters:", error);
      throw error;
    }
  };

  const handleUploadComplete = (result: { successful: Array<{ uploadURL: string; name: string; size: number; type: string }> }) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      
      const mediaData = {
        fileName: uploadedFile.name,
        originalName: uploadedFile.name,
        fileType: uploadedFile.type,
        fileSize: uploadedFile.size,
        uploadURL: uploadedFile.uploadURL,
      };
      
      uploadMediaMutation.mutate(mediaData);
    } else {
      console.error("No successful uploads found:", result);
    }
  };

  const handleLogoSelect = (mediaFile: MediaFile) => {
    setLabelData(prev => ({
      ...prev,
      logoUrl: mediaFile.objectPath, // Use the objectPath directly
      showLogo: true
    }));
  };

  const handleLogoDelete = (id: string) => {
    deleteMediaMutation.mutate(id);
  };

  const updateLabelData = (field: keyof LabelData, value: string | boolean) => {
    setLabelData(prev => ({ ...prev, [field]: value }));
  };

  const handleInventorySelect = (inventoryItem: any) => {
    const updatedData = {
      selectedInventoryId: inventoryItem.id,
      productName: inventoryItem.name,
      productCode: inventoryItem.sku,
      price: inventoryItem.price.toString(),
      qrContent: inventoryItem.sku,
      sizeIndicator: inventoryItem.size || "M",
      customMessage: labelData.customMessage,
      logoUrl: labelData.logoUrl,
      showQR: labelData.showQR,
      showLogo: labelData.showLogo,
      showPrice: labelData.showPrice,
      showMessage: labelData.showMessage,
      showSize: labelData.showSize
    };
    
    setLabelData(prev => ({
      ...prev,
      ...updatedData
    }));
    
    // Immediately save the template with inventory data
    if (templateLoaded) {
      autoSaveMutation.mutate({
        ...labelData,
        ...updatedData
      });
    }
    
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

  const downloadLabelImage = async () => {
    try {
      // Create a temporary container with the exact same HTML and CSS as the print version
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-5000px';
      tempContainer.style.top = '-5000px';
      tempContainer.style.width = '288px'; // 4 inches at 72 DPI
      tempContainer.style.height = '144px'; // 2 inches at 72 DPI
      tempContainer.style.fontFamily = 'Arial, sans-serif';
      tempContainer.style.fontSize = '10px'; // Base font size
      tempContainer.style.overflow = 'visible';
      
      // Add print CSS styles
      const style = document.createElement('style');
      style.textContent = `
        .temp-label {
          width: 288px;
          height: 144px;
          position: relative;
          padding: 7.2px; /* 0.1in at 72 DPI */
          box-sizing: border-box;
          background: white;
        }
        .temp-label-content {
          width: 100%;
          height: 100%;
          position: relative;
        }
        .temp-product-info {
          position: absolute;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          max-width: 45%;
        }
        .temp-product-name {
          font-size: 14px;
          font-weight: bold;
          margin: 0 0 2px 0;
          line-height: 1.1;
        }
        .temp-product-code {
          font-size: 10px;
          margin: 0 0 4px 0;
          color: #666;
        }
        .temp-price {
          font-size: 18px;
          font-weight: bold;
          margin: 0;
        }
        .temp-qr-code {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .temp-qr-code img {
          max-width: 72px; /* 1in at 72 DPI */
          max-height: 72px; /* 1in at 72 DPI */
        }
        .temp-logo {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 57.6px; /* 0.8in at 72 DPI */
          height: 43.2px; /* 0.6in at 72 DPI */
        }
        .temp-logo img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        .temp-size-indicator {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: bold;
          min-width: 43.2px; /* 0.6in at 72 DPI */
          min-height: 43.2px; /* 0.6in at 72 DPI */
        }
        .temp-message {
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
      `;
      document.head.appendChild(style);
      
      // Generate the same HTML structure as print (in pixels)
      const labelWidth = 273.6; // 288px - 14.4px padding
      const labelHeight = 129.6; // 144px - 14.4px padding
      
      const convertPosition = (percentage: number, dimension: number) => {
        return (percentage / 100) * dimension;
      };
      
      tempContainer.innerHTML = `
        <div class="temp-label">
          <div class="temp-label-content">
            <div class="temp-product-info" style="left: ${convertPosition(layout.productInfo.x, labelWidth)}px; top: ${convertPosition(layout.productInfo.y, labelHeight)}px;">
              <div class="temp-product-name">${labelData.productName}</div>
              <div class="temp-product-code">${labelData.productCode}</div>
              ${labelData.showPrice ? `<div class="temp-price">$${labelData.price}</div>` : ''}
            </div>
            ${labelData.showQR ? `<div class="temp-qr-code" style="left: ${convertPosition(layout.qrCode.x, labelWidth)}px; top: ${convertPosition(layout.qrCode.y, labelHeight)}px;"><img src="${qrCodeUrl}" /></div>` : ''}
            ${labelData.showLogo && labelData.logoUrl ? `<div class="temp-logo" style="left: ${convertPosition(layout.logo.x, labelWidth)}px; top: ${convertPosition(layout.logo.y, labelHeight)}px;"><img src="${labelData.logoUrl}" /></div>` : ''}
            ${labelData.showSize ? `<div class="temp-size-indicator" style="left: ${convertPosition(layout.sizeIndicator.x, labelWidth)}px; top: ${convertPosition(layout.sizeIndicator.y, labelHeight)}px;">${labelData.sizeIndicator}</div>` : ''}
            ${labelData.showMessage ? `<div class="temp-message" style="left: ${convertPosition(layout.message.x, labelWidth)}px; top: ${convertPosition(layout.message.y, labelHeight)}px;">${labelData.customMessage}</div>` : ''}
          </div>
        </div>
      `;
      
      document.body.appendChild(tempContainer);
      
      // Wait for images to load
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Capture the label as canvas with print dimensions
      const canvas = await html2canvas(tempContainer.firstElementChild as HTMLElement, {
        backgroundColor: 'white',
        scale: 4, // Higher resolution for print quality
        useCORS: true,
        allowTaint: true,
        width: 288, // 4 inches at 72 DPI
        height: 144, // 2 inches at 72 DPI
        logging: false, // Disable console logs
      });

      // Clean up
      document.body.removeChild(tempContainer);
      document.head.removeChild(style);

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return;
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `label-${labelData.productCode || 'design'}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Label Downloaded",
          description: "Label image saved to your downloads (print-ready format)",
          duration: 2000,
        });
      }, 'image/png');
    } catch (error) {
      console.error('Error downloading label:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download label image",
        variant: "destructive",
        duration: 3000,
      });
    }
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
                <Button variant="outline" onClick={downloadLabelImage}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Image
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
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-base font-semibold">Logo Library</Label>
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={5 * 1024 * 1024} // 5MB
                      onGetUploadParameters={handleGetUploadParameters}
                      onComplete={handleUploadComplete}
                      buttonClassName="h-8"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Upload Logo
                    </ObjectUploader>
                  </div>

                  {/* Logo Gallery */}
                  <div className="grid grid-cols-2 gap-4 max-h-64 overflow-y-auto">
                    {(mediaFiles || []).map((mediaFile) => (
                      <div
                        key={mediaFile.id}
                        className={cn(
                          "relative border rounded-lg p-3 cursor-pointer transition-all hover:border-primary/50 min-h-[120px]",
                          labelData.logoUrl === mediaFile.objectPath 
                            ? "border-primary bg-primary/5" 
                            : "border-border"
                        )}
                        onClick={() => handleLogoSelect(mediaFile)}
                        data-testid={`logo-${mediaFile.id}`}
                      >
                        <div className="aspect-square flex items-center justify-center bg-muted rounded h-20 w-full mb-2">
                          <img 
                            src={mediaFile.objectPath}
                            alt={mediaFile.originalName}
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        </div>
                        <p className="text-xs text-center truncate" title={mediaFile.originalName}>
                          {mediaFile.originalName}
                        </p>
                        
                        {/* Delete button */}
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 h-6 w-6 rounded-full p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLogoDelete(mediaFile.id);
                          }}
                          data-testid={`delete-logo-${mediaFile.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    
                    {(!mediaFiles || mediaFiles.length === 0) && (
                      <div className="col-span-2 text-center py-8 text-muted-foreground">
                        <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No logos uploaded yet</p>
                        <p className="text-xs">Upload your first logo to get started</p>
                      </div>
                    )}
                  </div>

                  {/* Currently selected logo */}
                  {labelData.logoUrl && (
                    <div className="mt-4 p-3 border rounded-lg bg-muted/50">
                      <Label className="text-sm font-medium">Currently Selected:</Label>
                      <div className="mt-2 flex items-center space-x-3">
                        <img 
                          src={labelData.logoUrl} 
                          className="w-12 h-12 object-contain border rounded"
                          alt="Selected logo"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLabelData(prev => ({ ...prev, logoUrl: "", showLogo: false }))}
                        >
                          Remove Logo
                        </Button>
                      </div>
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