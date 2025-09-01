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
import type { MediaFile, LabelTemplate } from "@shared/schema";

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

  // Query to get default label template (disable caching for fresh data)
  const { data: defaultTemplate, error: templateError, isLoading: templateLoading } = useQuery<LabelTemplate>({
    queryKey: ['/api/label-templates/default'],
    retry: false,
    staleTime: 0,
    gcTime: 0, // React Query v5 uses gcTime instead of cacheTime
    refetchOnMount: true,
    refetchOnWindowFocus: true,
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
  // Balanced layout allowing right-side placement while preventing overlaps
  const defaultLayout: LabelLayout = {
    productInfo: { x: 3, y: 5 },      // Top-left, small text block
    qrCode: { x: 60, y: 5 },          // Top-right, properly positioned
    logo: { x: 5, y: 45 },            // Mid-left area
    sizeIndicator: { x: 75, y: 60 },  // Bottom-right corner
    message: { x: 8, y: 75 }          // Bottom area, custom message
  };

  const [layout, setLayout] = useState<LabelLayout | null>(null);

  // Calculate optimal font size for size indicator to fit in one line
  const calculateSizeFontSize = (text: string, containerWidth: number = 96) => {
    // Base font size for single characters
    const baseFontSize = 36;
    
    // Adjust font size based on text length
    if (text.length <= 2) {
      return baseFontSize; // Full size for short text like "M", "XL"
    } else if (text.length <= 4) {
      return Math.max(28, baseFontSize - (text.length - 2) * 4); // Reduce for "XXXL", "OSFA"
    } else {
      // For longer text, calculate based on container width
      const targetWidth = containerWidth - 16; // Account for padding
      const approxCharWidth = baseFontSize * 0.6; // Rough character width ratio
      const calculatedSize = Math.max(16, targetWidth / (text.length * 0.6));
      return Math.min(baseFontSize, calculatedSize);
    }
  };

  // Simple percentage positioning - same for both preview and print/download
  const convertPercentageToPixels = (percentage: number, containerSize: number) => {
    return (percentage / 100) * containerSize;
  };

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
      console.log('🔧 PRODUCTION DEBUG: Loading saved label data:', defaultTemplate);
      console.log('🔧 PRODUCTION DEBUG: Template loaded state:', templateLoaded);
      const templateData: LabelData = {
        selectedInventoryId: defaultTemplate.selectedInventoryId || "",
        productName: defaultTemplate.productName || "Product Name",
        productCode: defaultTemplate.productCode || "PRD-001",
        price: defaultTemplate.price || "25.00",
        qrContent: defaultTemplate.qrContent || "PRD-001",
        customMessage: defaultTemplate.customMessage || "Thank you for your purchase",
        sizeIndicator: defaultTemplate.sizeIndicator || "M",
        logoUrl: defaultTemplate.logoUrl || "",
        showQR: defaultTemplate.showQR ?? true,
        showLogo: defaultTemplate.showLogo ?? false,
        showPrice: defaultTemplate.showPrice ?? true,
        showMessage: defaultTemplate.showMessage ?? true,
        showSize: defaultTemplate.showSize ?? true,
      };
      console.log('Merged label data:', templateData);
      setLabelData(templateData);
      
      // Load saved layout positions from template to prevent reset
      if (defaultTemplate.layoutPositions) {
        console.log('🔧 PRODUCTION DEBUG: Loading saved layout positions:', defaultTemplate.layoutPositions);
        console.log('🔧 PRODUCTION DEBUG: Layout positions type:', typeof defaultTemplate.layoutPositions);
        try {
          const savedLayout = typeof defaultTemplate.layoutPositions === 'string' 
            ? JSON.parse(defaultTemplate.layoutPositions)
            : defaultTemplate.layoutPositions;
          console.log('🔧 PRODUCTION DEBUG: Parsed layout:', savedLayout);
          setLayout(savedLayout);
          console.log('🔧 PRODUCTION DEBUG: Layout state set successfully');
        } catch (error) {
          console.error('🔧 PRODUCTION DEBUG: Failed to parse saved layout positions:', error);
          console.log('🔧 PRODUCTION DEBUG: Using default layout due to parsing error');
          setLayout(defaultLayout);
        }
      } else {
        // No saved positions, use default layout
        console.log('🔧 PRODUCTION DEBUG: No saved positions found, using default layout');
        setLayout(defaultLayout);
      }
      
      setTemplateLoaded(true);
    } else if (!defaultTemplate && !templateLoading && !templateError && !templateLoaded) {
      // No template found - use default layout and enable auto-save for new template creation
      console.log('🔧 PRODUCTION DEBUG: No template found, using default layout');
      setLayout(defaultLayout);
      setTemplateLoaded(true); // Enable auto-save even without existing template
    }
  }, [defaultTemplate, templateLoaded, templateLoading, templateError]);

  // Auto-save label data to server whenever it changes (but only after template is loaded)
  useEffect(() => {
    if (!templateLoaded) return; // Don't auto-save until template is loaded
    
    const timeoutId = setTimeout(() => {
      autoSaveMutation.mutate(labelData);
    }, 2000); // 2 second delay for auto-save

    return () => clearTimeout(timeoutId);
  }, [labelData, templateLoaded]);

  // Save layout to database whenever it changes (remove localStorage to avoid conflicts)
  useEffect(() => {
    if (!templateLoaded || !defaultTemplate?.id) return;
    
    const timeoutId = setTimeout(() => {
      // Save layout to database immediately when it changes - JSON.stringify the layout object
      console.log('🔧 PRODUCTION DEBUG: Saving layout to database:', layout);
      autoSaveMutation.mutate({
        ...labelData,
        layoutPositions: JSON.stringify(layout) // ✅ Convert object to JSON string
      } as any);
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [layout, templateLoaded, defaultTemplate?.id]);

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
    if (!layout) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const labelsPerSheet = Math.min(labelCount, 10); // Max 10 per Avery 94207 sheet
    
    // Use simpler label generation with inline styles only
    const generateSimpleLabelHTML = () => {
      const convertPosition = (percentage: number, dimension: number) => {
        return (percentage / 100) * dimension;
      };
      
      return `<div class="label"><div class="label-content">
        <div style="position: absolute; left: ${convertPosition(layout.productInfo.x, 3.8)}in; top: ${convertPosition(layout.productInfo.y, 1.8)}in; width: 2.5in;">
          <div style="font-size: 18px; font-weight: bold; margin: 0 0 2px 0; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${labelData.productName}</div>
          <div style="font-size: 12px; margin: 0 0 4px 0; color: #666;">${labelData.productCode}</div>
          ${labelData.showPrice ? `<div style="font-size: 24px; font-weight: bold; margin: 0;">$${labelData.price}</div>` : ''}
        </div>
        ${labelData.showQR ? `<div style="position: absolute; left: ${convertPosition(layout.qrCode.x, 3.8)}in; top: ${convertPosition(layout.qrCode.y, 1.8)}in;"><img src="${qrCodeUrl}" style="max-width: 1.5in; max-height: 1.5in;" /></div>` : ''}
        ${labelData.showLogo && labelData.logoUrl ? `<div style="position: absolute; left: ${convertPosition(layout.logo.x, 3.8)}in; top: ${convertPosition(layout.logo.y, 1.8)}in; width: 0.8in; height: 0.6in; display: flex; align-items: center; justify-content: center;"><img src="${labelData.logoUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain;" /></div>` : ''}
        ${labelData.showSize ? `<div style="position: absolute; left: ${convertPosition(layout.sizeIndicator.x, 3.8)}in; top: ${convertPosition(layout.sizeIndicator.y, 1.8)}in; border: 1px solid #333; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: bold; min-width: 0.8in; min-height: 0.8in;">${labelData.sizeIndicator}</div>` : ''}
        ${labelData.showMessage ? `<div style="position: absolute; left: ${convertPosition(layout.message.x, 3.8)}in; top: ${convertPosition(layout.message.y, 1.8)}in; font-size: 11px; text-align: center; font-style: italic; max-width: 80%; white-space: pre-wrap;">${labelData.customMessage}</div>` : ''}
      </div></div>`;
    };
    
    const labels = Array.from({ length: labelsPerSheet }, () => generateSimpleLabelHTML()).join('');

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
              width: 2.5in !important;
            }
            .product-name {
              font-size: 18px; /* Larger product name for print */
              font-weight: bold;
              margin: 0 0 2px 0;
              line-height: 1.1;
              white-space: nowrap !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
            }
            .product-code {
              font-size: 12px; /* Larger product code for print */
              margin: 0 0 4px 0;
              color: #666;
            }
            .price {
              font-size: 24px; /* Larger price for print */
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
              max-width: 1.5in; /* Larger QR code for print */
              max-height: 1.5in; /* Larger QR code for print */
            }
            .logo {
              position: absolute;
              display: flex;
              align-items: center;
              justify-content: center;
              width: .8in; /* Much larger logo for print */
              height: 0.6in; /* Much larger logo for print */
            }
            .logo img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }
            .size-indicator {
              position: absolute;
              border: 1px solid #333;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 36px; /* Larger font for print */
              font-weight: bold;
              min-width: 0.8in; /* Larger size indicator for print */
              min-height: 0.8in; /* Larger size indicator for print */
            }
            .message {
              position: absolute;
              font-size: 11px; /* Larger message font for print */
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
    printWindow.print();
  };

  const generateLabelHTML = () => {
    if (!layout) return '';
    
    // Convert percentages to inches (4in width, 2in height after padding)
    const labelWidth = 3.8; // 4in - 0.2in padding
    const labelHeight = 1.8; // 2in - 0.2in padding
    
    const convertPosition = (percentage: number, dimension: number) => {
      return (percentage / 100) * dimension;
    };
    
    return `
      <div class="label">
        <div class="label-content">
          <div class="product-info" style="left: ${convertPosition(layout.productInfo.x, labelWidth)}in; top: ${convertPosition(layout.productInfo.y, labelHeight)}in; width: 2.5in;">
            <div class="product-name" style="white-space: nowrap;">${labelData.productName}</div>
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
    if (!layout) return;
    
    try {
      // Create a temporary container that EXACTLY matches the preview
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-5000px';
      tempContainer.style.top = '-5000px';
      tempContainer.style.fontFamily = 'Arial, sans-serif';
      
      // Use same dimensions as preview canvas for exact positioning match
      const labelWidth = 480; // Match preview canvas width exactly
      const labelHeight = 240; // Match preview canvas height exactly
      
      // Simple percentage to pixel conversion - same as preview
      const convertPosition = (percentage: number, dimension: number) => {
        return (percentage / 100) * dimension;
      };
      
      // Create the exact same structure as the preview using inline styles
      tempContainer.innerHTML = `
        <div style="
          width: 480px;
          height: 240px;
          position: relative;
          background: white;
          padding: 0;
          margin: 0;
          font-family: Arial, sans-serif;
        ">
          <!-- Product Info - exact same styling as preview -->
          <div style="
            position: absolute;
            left: ${convertPosition(layout.productInfo.x, labelWidth)}px;
            top: ${convertPosition(layout.productInfo.y, labelHeight)}px;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            padding: 8px;
          ">
            <div style="font-size: 18px; font-weight: bold; margin-bottom: 2px; line-height: 1.1; white-space: nowrap;">${labelData.productName}</div>
            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">${labelData.productCode}</div>
            ${labelData.showPrice ? `<div style="font-size: 24px; font-weight: bold; margin: 0;">$${labelData.price}</div>` : ''}
          </div>
          
          <!-- QR Code - exact same styling as preview -->
          ${labelData.showQR ? `
          <div style="
            position: absolute;
            left: ${convertPosition(layout.qrCode.x, labelWidth)}px;
            top: ${convertPosition(layout.qrCode.y, labelHeight)}px;
            padding: 4px;
          ">
            <img src="${qrCodeUrl}" style="width: 120px; height: 120px;" />
          </div>
          ` : ''}
          
          <!-- Logo - exact same styling as preview -->
          ${labelData.showLogo && labelData.logoUrl ? `
          <div style="
            position: absolute;
            left: ${convertPosition(layout.logo.x, labelWidth)}px;
            top: ${convertPosition(layout.logo.y, labelHeight)}px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 144px;
            height: 108px;
            padding: 4px;
          ">
            <img src="${labelData.logoUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
          </div>
          ` : ''}
          
          <!-- Size Indicator - exact same styling as preview -->
          ${labelData.showSize ? `
          <div style="
            position: absolute;
            left: ${convertPosition(layout.sizeIndicator.x, labelWidth)}px;
            top: ${convertPosition(layout.sizeIndicator.y, labelHeight)}px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            min-width: 96px;
            min-height: 96px;
            font-size: ${calculateSizeFontSize(labelData.sizeIndicator, 96)}px;
            white-space: nowrap;
            overflow: hidden;
            padding: 8px;
          ">${labelData.sizeIndicator}</div>
          ` : ''}
          
          <!-- Message - exact same styling as preview -->
          ${labelData.showMessage ? `
          <div style="
            position: absolute;
            left: ${convertPosition(layout.message.x, labelWidth)}px;
            top: ${convertPosition(layout.message.y, labelHeight)}px;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            max-width: 80%;
            white-space: pre-wrap;
            font-size: 11px;
            font-style: italic;
            padding: 8px;
          ">${labelData.customMessage}</div>
          ` : ''}
        </div>
      `;
      
      document.body.appendChild(tempContainer);
      
      // Wait for images to load
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Capture the label as canvas with exact same dimensions as preview
      const canvas = await html2canvas(tempContainer.firstElementChild as HTMLElement, {
        backgroundColor: 'white',
        scale: 2, // Higher resolution for print quality
        useCORS: true,
        allowTaint: true,
        width: 480, // Match preview width exactly
        height: 240, // Match preview height exactly
        logging: false, // Disable console logs
      });

      // Clean up
      document.body.removeChild(tempContainer);

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
          description: "Label image saved to your downloads (matches preview exactly)",
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
    
    // Strict constraints to prevent overlaps in 288px × 576px canvas
    let maxX = 85;
    let maxY = 85;
    
    // Liberal constraints - elements can move nearly anywhere on the label
    maxX = 95; // Allow all elements to move to 95% across (almost to the right edge)
    maxY = 95; // Allow all elements to move to 95% down (almost to the bottom)
    
    const constrainedX = Math.max(0, Math.min(maxX, x));
    const constrainedY = Math.max(0, Math.min(maxY, y));
    
    setLayout(prev => prev ? ({
      ...prev,
      [isDragging]: { x: constrainedX, y: constrainedY }
    }) : null);
  };

  const handleMouseUp = () => {
    // Layout is now automatically saved via useEffect when it changes
    setIsDragging(null);
    setDragOffset({ x: 0, y: 0 });
  };

  // Show loading state until layout is initialized
  if (!layout || templateLoading) {
    console.log('🔧 PRODUCTION DEBUG: Showing loading state - layout:', !!layout, 'templateLoading:', templateLoading);
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Avery 94207 Label Designer</h1>
          <p className="text-muted-foreground">Loading template...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Label Designer</h1>
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
                    top: `${layout.productInfo.y}%`
                  }}
                  onMouseDown={(e) => handleMouseDown('productInfo', e)}
                >
                  <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '2px', lineHeight: '1.1', whiteSpace: 'nowrap' }}>{labelData.productName}</div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{labelData.productCode}</div>
                  {labelData.showPrice && (
                    <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '0' }}>${labelData.price}</div>
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
                    <img src={qrCodeUrl} style={{ width: '120px', height: '120px' }} />
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
                      width: '144px',
                      height: '108px'
                    }}
                    onMouseDown={(e) => handleMouseDown('logo', e)}
                  >
                    <img src={labelData.logoUrl} className="max-w-full max-h-full object-contain" />
                  </div>
                )}

                {/* Size Indicator */}
                {labelData.showSize && (
                  <div 
                    className={`absolute cursor-move p-2 rounded border-2 transition-all flex items-center justify-center font-bold ${
                      isDragging === 'sizeIndicator' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-gray-400'
                    }`}
                    style={{
                      left: `${layout.sizeIndicator.x}%`,
                      top: `${layout.sizeIndicator.y}%`,
                      minWidth: '96px',
                      minHeight: '96px',
                      fontSize: `${calculateSizeFontSize(labelData.sizeIndicator, 96)}px`,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden'
                    }}
                    onMouseDown={(e) => handleMouseDown('sizeIndicator', e)}
                  >
                    {labelData.sizeIndicator}
                  </div>
                )}

                {/* Message */}
                {labelData.showMessage && (
                  <div 
                    className={`absolute cursor-move p-2 rounded border-2 transition-all flex items-center justify-center text-center ${
                      isDragging === 'message' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-gray-400'
                    }`}
                    style={{
                      left: `${layout.message.x}%`,
                      top: `${layout.message.y}%`,
                      maxWidth: '80%',
                      whiteSpace: 'pre-wrap',
                      fontSize: '11px',
                      fontStyle: 'italic'
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
                        id="inventory-select"
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
                    <SelectTrigger id="size-indicator">
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