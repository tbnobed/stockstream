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
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import { Download, Upload, Eye, Settings, Copy, Check, ChevronsUpDown, Trash2, Plus } from "lucide-react";
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
  showMember: boolean;
  // Element scale properties (as percentages)
  qrCodeScale: number;
  logoScale: number;
  productInfoScale: number;
  sizeIndicatorScale: number;
  messageScale: number;
  memberScale: number;
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
  member: ElementPosition;
}

const defaultLabelData: LabelData = {
  selectedInventoryId: "",
  productName: "Product Name",
  productCode: "PRD-001",
  price: "25.00",
  qrContent: "PRD-001",
  customMessage: "Thank you for your purchase",
  sizeIndicator: "",
  logoUrl: "",
  showQR: true,
  showLogo: false,
  showPrice: true,
  showMessage: true,
  showSize: true,
  showMember: false,
  // Default scale values (100% = original size)
  qrCodeScale: 100,
  logoScale: 100,
  productInfoScale: 100,
  sizeIndicatorScale: 100,
  messageScale: 100,
  memberScale: 100,
};

export default function LabelDesigner() {
  const [labelData, setLabelData] = useState<LabelData>(defaultLabelData);
  const [logoAspectRatio, setLogoAspectRatio] = useState(1); // width/height ratio
  
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
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

  // Track template loading state to prevent auto-save until template is fully loaded
  const [templateLoaded, setTemplateLoaded] = useState(false);

  // Helper function to parse product name and extract size
  const parseProductName = (productName: string) => {
    // Check if the product name ends with size in parentheses like "(XXL)"
    const sizeMatch = productName.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    if (sizeMatch) {
      return {
        mainName: sizeMatch[1].trim(),
        sizePart: sizeMatch[2].trim(),
        hasSize: true
      };
    }
    return {
      mainName: productName,
      sizePart: '',
      hasSize: false
    };
  };

  // Helper function for dynamic size calculation
  const calculateSizeFontSize = (text: string, containerWidth: number = 96) => {
    // Return default size for empty text
    if (!text || text.length === 0) {
      return 20;
    }
    
    // Base font size for single characters
    const baseFontSize = 48;
    
    // Scale down based on text length
    if (text.length === 1) {
      return baseFontSize;
    } else if (text.length === 2) {
      return baseFontSize * 0.8;
    } else if (text.length === 3) {
      return baseFontSize * 0.6;
    } else {
      // For longer text, scale based on container width
      return Math.max(20, containerWidth / (text.length * 0.6));
    }
  };

  // Helper function to convert percentage to pixels
  const convertPercentageToPixels = (percentage: number, containerSize: number) => {
    return (percentage / 100) * containerSize;
  };

  // Default layout positions (as percentages of container dimensions)
  const defaultLayout: LabelLayout = {
    productInfo: { x: 2, y: 8 },
    qrCode: { x: 72, y: 2 },
    logo: { x: 38, y: 30 },
    sizeIndicator: { x: 75, y: 55 },
    message: { x: 5, y: 70 },
    member: { x: 5, y: 40 }
  };

  const [layout, setLayout] = useState<LabelLayout>(defaultLayout);

  // Initialize queries
  const { data: inventoryItems } = useQuery({
    queryKey: ['/api/inventory'],
  });

  const { data: mediaFiles, refetch: refetchMedia } = useQuery({
    queryKey: ['/api/media'],
  });

  const { data: sizeOptions, isLoading: sizesLoading, error: sizesError } = useQuery({
    queryKey: ['/api/categories/size'],
  });

  const queryClient = useQueryClient();

  // Media upload mutation
  const uploadMediaMutation = useMutation({
    mutationFn: async (mediaData: any) => {
      return apiRequest('POST', '/api/media', mediaData);
    },
    onSuccess: () => {
      refetchMedia();
      toast({
        title: "Logo uploaded successfully",
        description: "Your logo is now available in the media library",
      });
    },
    onError: (error) => {
      console.error('Error uploading media:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your logo",
        variant: "destructive",
      });
    },
  });

  // Delete media mutation
  const deleteMediaMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/media/${id}`);
    },
    onSuccess: () => {
      refetchMedia();
      toast({
        title: "Logo deleted",
        description: "Logo removed from media library",
      });
    },
    onError: (error) => {
      console.error('Error deleting media:', error);
      toast({
        title: "Delete failed",
        description: "There was an error deleting the logo",
        variant: "destructive",
      });
    },
  });

  // Load template data when available
  useEffect(() => {
    if (defaultTemplate && !templateLoaded) {
      console.log('🔧 PRODUCTION DEBUG: Showing loading state - layout:', !!layout, 'templateLoading:', templateLoading);
      console.log('🔧 PRODUCTION DEBUG: Loading saved label data:', defaultTemplate);
      setTemplateLoaded(false); // Prevent auto-save during loading
      
      const mergedData = {
        selectedInventoryId: defaultTemplate.selectedInventoryId || "",
        productName: defaultTemplate.productName || "Product Name",
        productCode: defaultTemplate.productCode || "PRD-001", 
        price: defaultTemplate.price || "25.00",
        qrContent: defaultTemplate.qrContent || "PRD-001",
        customMessage: defaultTemplate.customMessage || "Thank you for your purchase",
        sizeIndicator: defaultTemplate.sizeIndicator || "",
        logoUrl: defaultTemplate.logoUrl || "",
        showQR: defaultTemplate.showQR ?? true,
        showLogo: defaultTemplate.showLogo ?? false,
        showPrice: defaultTemplate.showPrice ?? true,
        showMessage: defaultTemplate.showMessage ?? true,
        showSize: defaultTemplate.showSize ?? true,
        showMember: (defaultTemplate as any).showMember ?? false,
        // Handle scale properties with defaults for backward compatibility
        qrCodeScale: (defaultTemplate as any).qrCodeScale ?? 100,
        logoScale: (defaultTemplate as any).logoScale ?? 100,
        productInfoScale: (defaultTemplate as any).productInfoScale ?? 100,
        sizeIndicatorScale: (defaultTemplate as any).sizeIndicatorScale ?? 100,
        messageScale: (defaultTemplate as any).messageScale ?? 100,
        memberScale: (defaultTemplate as any).memberScale ?? 100
      };
      
      console.log('Merged label data:', mergedData);
      setLabelData(mergedData);
      
      // Load saved layout positions
      if (defaultTemplate.layoutPositions) {
        try {
          console.log('🔧 PRODUCTION DEBUG: Loading saved layout positions:', defaultTemplate.layoutPositions);
          console.log('🔧 PRODUCTION DEBUG: Layout positions type:', typeof defaultTemplate.layoutPositions);
          
          const savedLayout = typeof defaultTemplate.layoutPositions === 'string' 
            ? JSON.parse(defaultTemplate.layoutPositions)
            : defaultTemplate.layoutPositions;
          
          console.log('🔧 PRODUCTION DEBUG: Parsed layout:', savedLayout);
          
          // Merge saved layout with default layout to ensure all properties exist
          const mergedLayout = {
            ...defaultLayout,
            ...savedLayout
          };
          
          setLayout(mergedLayout);
          console.log('🔧 PRODUCTION DEBUG: Layout state set successfully');
        } catch (error) {
          console.error('Failed to parse saved layout positions:', error);
          setLayout(defaultLayout);
        }
      }
      
      console.log('🔧 PRODUCTION DEBUG: Template loaded state:', templateLoaded);
      setTemplateLoaded(true); // Enable auto-save after loading
    }
  }, [defaultTemplate, templateLoaded]);

  // Auto-save label data changes after 2 seconds of inactivity
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
    }
  };

  const handleLogoSelect = (mediaFile: MediaFile) => {
    setLabelData(prev => ({
      ...prev,
      logoUrl: mediaFile.objectPath,
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
      sizeIndicator: inventoryItem.size || "",
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
      const labelWidth = 600; // Match preview canvas width exactly
      const labelHeight = 300; // Match preview canvas height exactly
      
      // Simple percentage to pixel conversion - same as preview
      const convertPosition = (percentage: number, dimension: number) => {
        return (percentage / 100) * dimension;
      };
      
      // Create the exact same structure as the preview using inline styles
      tempContainer.innerHTML = `
        <div style="
          width: ${labelWidth}px;
          height: ${labelHeight}px;
          position: relative;
          background: white;
          font-family: Arial, sans-serif;
          border: 1px solid #ddd;
        ">
          <!-- Product Info -->
          <div style="
            position: absolute;
            left: ${convertPosition(layout.productInfo.x, labelWidth)}px;
            top: ${convertPosition(layout.productInfo.y, labelHeight)}px;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            padding: 8px;
          ">
            ${(() => {
              const parsedName = parseProductName(labelData.productName);
              if (parsedName.hasSize) {
                return `<div style="
                  font-size: ${20 * (labelData.productInfoScale / 100)}px;
                  font-weight: bold;
                  margin-bottom: 2px;
                  line-height: 1.1;
                ">${parsedName.mainName}</div>
                <div style="
                  font-size: ${18 * (labelData.productInfoScale / 100)}px;
                  font-weight: bold;
                  color: #555;
                  margin-bottom: 2px;
                  line-height: 1.1;
                ">(${parsedName.sizePart})</div>`;
              } else {
                return `<div style="
                  font-size: ${20 * (labelData.productInfoScale / 100)}px;
                  font-weight: bold;
                  margin-bottom: 2px;
                  line-height: 1.1;
                ">${labelData.productName}</div>`;
              }
            })()}
            <div style="
              font-size: ${12 * (labelData.productInfoScale / 100)}px;
              color: #666;
              margin-bottom: 4px;
            ">${labelData.productCode}</div>
            ${labelData.showPrice ? `<div style="
              font-size: ${24 * (labelData.productInfoScale / 100)}px;
              font-weight: bold;
              margin: 0;
            ">$${labelData.price}</div>` : ''}
          </div>
          
          ${labelData.showQR && qrCodeUrl ? `
          <!-- QR Code -->
          <div style="
            position: absolute;
            left: ${convertPosition(layout.qrCode.x, labelWidth)}px;
            top: ${convertPosition(layout.qrCode.y, labelHeight)}px;
            width: ${159 * (labelData.qrCodeScale / 100)}px;
            height: ${159 * (labelData.qrCodeScale / 100)}px;
            padding: 4px;
            border: 2px solid transparent;
            border-radius: 0.25rem;
            box-sizing: border-box;
          ">
            <img src="${qrCodeUrl}" style="width: 100%; height: 100%; object-fit: contain;" alt="QR Code" />
          </div>` : ''}
          
          ${labelData.showLogo && labelData.logoUrl ? `
          <!-- Logo -->
          <div style="
            position: absolute;
            left: ${convertPosition(layout.logo.x, labelWidth)}px;
            top: ${convertPosition(layout.logo.y, labelHeight)}px;
            width: ${getLogoDimensions(labelData.logoScale).width}px;
            height: ${getLogoDimensions(labelData.logoScale).height}px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 4px;
            border: 2px solid transparent;
            border-radius: 0.25rem;
            box-sizing: border-box;
          ">
            <img src="${labelData.logoUrl}" style="width: 100%; height: 100%; object-fit: contain;" alt="Logo" />
          </div>` : ''}
          
          ${labelData.showSize && labelData.sizeIndicator && labelData.sizeIndicator.trim().length > 0 ? `
          <!-- Size Indicator -->
          <div style="
            position: absolute;
            left: ${convertPosition(layout.sizeIndicator.x, labelWidth)}px;
            top: ${convertPosition(layout.sizeIndicator.y, labelHeight)}px;
            min-width: ${96 * (labelData.sizeIndicatorScale / 100)}px;
            min-height: ${96 * (labelData.sizeIndicatorScale / 100)}px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            white-space: nowrap;
            overflow: hidden;
            padding: 8px;
            font-size: ${calculateSizeFontSize(labelData.sizeIndicator, 96 * (labelData.sizeIndicatorScale / 100)) * (labelData.sizeIndicatorScale / 100)}px;
          ">${labelData.sizeIndicator}</div>` : ''}
          
          ${labelData.showMessage ? `
          <!-- Message -->
          <div style="
            position: absolute;
            left: ${convertPosition(layout.message.x, labelWidth)}px;
            top: ${convertPosition(layout.message.y, labelHeight)}px;
            max-width: 80%;
            white-space: pre-wrap;
            font-size: ${17 * (labelData.messageScale / 100)}px;
            font-style: italic;
            text-align: center;
          ">${labelData.customMessage}</div>` : ''}
        </div>
      `;
      
      document.body.appendChild(tempContainer);
      
      const canvas = await html2canvas(tempContainer.firstElementChild as HTMLElement, {
        width: labelWidth,
        height: labelHeight,
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true
      });
      
      document.body.removeChild(tempContainer);
      
      // Download the image
      const link = document.createElement('a');
      link.download = `label-${labelData.productCode || 'design'}.png`;
      link.href = canvas.toDataURL();
      link.click();
      
      toast({
        title: "Label downloaded",
        description: "Label image saved to your device",
      });
    } catch (error) {
      console.error('Error generating label image:', error);
      toast({
        title: "Download failed", 
        description: "There was an error generating the label image",
        variant: "destructive",
      });
    }
  };

  const handleMouseDown = (elementId: string, e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(elementId);
    
    const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    const elementRect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - elementRect.left,
      y: e.clientY - elementRect.top
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    
    const x = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
    const y = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;
    
    // Constrain to container bounds
    const constrainedX = Math.max(0, Math.min(85, x));
    const constrainedY = Math.max(0, Math.min(85, y));
    
    setLayout(prev => ({
      ...prev,
      [isDragging]: {
        x: constrainedX,
        y: constrainedY
      }
    }));
  };

  const handleMouseUp = () => {
    // Layout is now automatically saved via useEffect when it changes
    setIsDragging(null);
  };

  // Generate QR code whenever content changes
  useEffect(() => {
    if (labelData.qrContent) {
      generateQRCode();
    }
  }, [labelData.qrContent]);

  // Calculate logo aspect ratio when logo URL changes
  useEffect(() => {
    if (labelData.logoUrl) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const aspectRatio = img.naturalWidth / img.naturalHeight
        setLogoAspectRatio(aspectRatio)
      }
      img.onerror = () => {
        setLogoAspectRatio(1) // Default to square if image fails to load
      }
      img.src = labelData.logoUrl
    } else {
      setLogoAspectRatio(1)
    }
  }, [labelData.logoUrl])

  // Calculate logo dimensions based on aspect ratio
  const getLogoDimensions = (scale: number) => {
    const baseSize = 180 // Base size in pixels
    const scaledSize = baseSize * (scale / 100)
    
    if (logoAspectRatio >= 1) {
      // Wider or square logo
      return {
        width: scaledSize,
        height: scaledSize / logoAspectRatio
      }
    } else {
      // Taller logo
      return {
        width: scaledSize * logoAspectRatio,
        height: scaledSize
      }
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Label Designer</h1>
        <p className="text-muted-foreground">Design and print custom product labels</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Preview Panel */}
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Live Preview
            </CardTitle>
            <CardDescription>
              Drag elements to reposition them on the label
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Live Preview Container */}
              <div 
                className="relative bg-white border-2 border-dashed border-gray-300 mx-auto cursor-crosshair"
                style={{ 
                  width: '600px', 
                  height: '300px',
                  fontFamily: 'Arial, sans-serif'
                }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Product Info */}
                <div 
                  className={`absolute cursor-move p-2 rounded border-2 transition-all flex flex-col justify-start ${
                    isDragging === 'productInfo' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-gray-400'
                  }`}
                  style={{
                    left: `${layout.productInfo.x}%`,
                    top: `${layout.productInfo.y}%`,
                    padding: '8px'
                  }}
                  onMouseDown={(e) => handleMouseDown('productInfo', e)}
                >
                  {(() => {
                    const parsedName = parseProductName(labelData.productName);
                    const scale = labelData.productInfoScale / 100;
                    if (parsedName.hasSize) {
                      return (
                        <>
                          <div className="font-bold leading-tight" style={{ fontSize: `${1.25 * scale}rem` }}>
                            {parsedName.mainName}
                          </div>
                          <div className="font-bold text-gray-700 leading-tight" style={{ fontSize: `${1.125 * scale}rem` }}>
                            ({parsedName.sizePart})
                          </div>
                        </>
                      );
                    } else {
                      return (
                        <div className="font-bold leading-tight" style={{ fontSize: `${1.25 * scale}rem` }}>
                          {labelData.productName}
                        </div>
                      );
                    }
                  })()}
                  <div className="text-gray-600 mt-1" style={{ fontSize: `${0.75 * labelData.productInfoScale / 100}rem` }}>
                    {labelData.productCode}
                  </div>
                  {labelData.showPrice && (
                    <div className="font-bold mt-1" style={{ fontSize: `${1.5 * labelData.productInfoScale / 100}rem` }}>
                      ${labelData.price}
                    </div>
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
                      top: `${layout.qrCode.y}%`,
                      width: `${159 * (labelData.qrCodeScale / 100)}px`,
                      height: `${159 * (labelData.qrCodeScale / 100)}px`,
                      padding: '4px'
                    }}
                    onMouseDown={(e) => handleMouseDown('qrCode', e)}
                  >
                    <img 
                      src={qrCodeUrl} 
                      style={{ 
                        width: '100%', 
                        height: '100%',
                        objectFit: 'contain'
                      }} 
                      alt="QR Code"
                      data-testid="qr-code-preview"
                    />
                  </div>
                )}

                {/* Logo */}
                {labelData.showLogo && labelData.logoUrl && (
                  <div 
                    className={`absolute cursor-move rounded border-2 transition-all flex items-center justify-center ${
                      isDragging === 'logo' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-gray-400'
                    }`}
                    style={{
                      left: `${layout.logo.x}%`,
                      top: `${layout.logo.y}%`,
                      width: `${getLogoDimensions(labelData.logoScale).width}px`,
                      height: `${getLogoDimensions(labelData.logoScale).height}px`,
                      padding: '4px'
                    }}
                    onMouseDown={(e) => handleMouseDown('logo', e)}
                  >
                    <img 
                      src={labelData.logoUrl} 
                      style={{ 
                        width: '100%', 
                        height: '100%',
                        objectFit: 'contain'
                      }}
                      alt="Logo"
                      data-testid="logo-preview"
                    />
                  </div>
                )}

                {/* Size Indicator */}
                {labelData.showSize && labelData.sizeIndicator && labelData.sizeIndicator.trim().length > 0 && (
                  <div 
                    className={`absolute cursor-move border-2 transition-all flex items-center justify-center font-bold whitespace-nowrap overflow-hidden ${
                      isDragging === 'sizeIndicator' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-gray-400'
                    }`}
                    style={{
                      left: `${layout.sizeIndicator.x}%`,
                      top: `${layout.sizeIndicator.y}%`,
                      minWidth: `${96 * (labelData.sizeIndicatorScale / 100)}px`,
                      minHeight: `${96 * (labelData.sizeIndicatorScale / 100)}px`,
                      padding: '8px',
                      fontSize: `${calculateSizeFontSize(labelData.sizeIndicator, 96 * (labelData.sizeIndicatorScale / 100)) * (labelData.sizeIndicatorScale / 100)}px`
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
                      fontSize: `${17 * (labelData.messageScale / 100)}px`,
                      fontStyle: 'italic'
                    }}
                    onMouseDown={(e) => handleMouseDown('message', e)}
                  >
                    {labelData.customMessage}
                  </div>
                )}

                {/* Member Text */}
                {labelData.showMember && (
                  <div 
                    className={`absolute cursor-move p-2 rounded border-2 transition-all flex items-center justify-center font-bold ${
                      isDragging === 'member' ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-gray-400'
                    }`}
                    style={{
                      left: `${layout.member.x}%`,
                      top: `${layout.member.y}%`,
                      fontSize: `${24 * (labelData.memberScale / 100)}px`,
                      color: 'red',
                      fontWeight: 'bold',
                      textTransform: 'uppercase'
                    }}
                    onMouseDown={(e) => handleMouseDown('member', e)}
                    data-testid="member-text-preview"
                  >
                    MEMBER
                  </div>
                )}

                {/* Helper text */}
                <div className="absolute bottom-2 right-2 text-xs text-gray-400 pointer-events-none">
                  Drag elements to reposition
                </div>
              </div>
            </div>

            {/* Download Controls */}
            <div className="space-y-3 mt-8">
              <div className="flex gap-2">
                <Button onClick={downloadLabelImage} className="flex-1" data-testid="button-download-image">
                  <Download className="h-4 w-4 mr-2" />
                  Download Image
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customization Panel */}
        <Card className="xl:col-span-2">
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
                    value={labelData.sizeIndicator || "none"} 
                    onValueChange={(value) => updateLabelData('sizeIndicator', value === "none" ? "" : value)}
                    disabled={sizesLoading}
                  >
                    <SelectTrigger id="size-indicator" data-testid="select-size-indicator">
                      <SelectValue placeholder={sizesLoading ? "Loading sizes..." : sizesError ? "Failed to load sizes" : "Select size..."} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" data-testid="option-size-none">None (No Size)</SelectItem>
                      {sizesError ? (
                        <SelectItem value="error" disabled>
                          Failed to load sizes
                        </SelectItem>
                      ) : (!sizeOptions || (sizeOptions as any[]).length === 0) ? (
                        <SelectItem value="empty" disabled>
                          No sizes configured
                        </SelectItem>
                      ) : (
                        (sizeOptions as any[])
                          .filter((size: any) => size.isActive !== false)
                          .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0))
                          .map((size: any) => (
                            <SelectItem key={size.id} value={size.value} data-testid={`option-size-${size.id}`}>
                              {size.value}
                            </SelectItem>
                          ))
                      )}
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
                    {(mediaFiles as any[] || []).map((mediaFile: any) => (
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
                    
                    {(!mediaFiles || (mediaFiles as any[]).length === 0) && (
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
              <TabsContent value="layout" className="space-y-6">
                {/* Visibility Controls */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-secondary">Element Visibility</h4>
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-member">Show MEMBER</Label>
                    <Switch
                      id="show-member"
                      checked={labelData.showMember}
                      onCheckedChange={(checked) => updateLabelData('showMember', checked)}
                      data-testid="switch-show-member"
                    />
                  </div>
                </div>

                {/* Element Size Controls */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-secondary">Element Sizes</h4>
                  
                  {/* Product Info Scale */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="product-info-scale">Product Info Size</Label>
                      <span className="text-sm text-muted-foreground">{labelData.productInfoScale}%</span>
                    </div>
                    <Slider
                      id="product-info-scale"
                      min={25}
                      max={200}
                      step={5}
                      value={[labelData.productInfoScale]}
                      onValueChange={(value) => setLabelData(prev => ({ ...prev, productInfoScale: value[0] }))}
                      className="w-full"
                    />
                  </div>

                  {/* QR Code Scale */}
                  {labelData.showQR && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="qr-code-scale">QR Code Size</Label>
                        <span className="text-sm text-muted-foreground">{labelData.qrCodeScale}%</span>
                      </div>
                      <Slider
                        id="qr-code-scale"
                        min={25}
                        max={200}
                        step={5}
                        value={[labelData.qrCodeScale]}
                        onValueChange={(value) => setLabelData(prev => ({ ...prev, qrCodeScale: value[0] }))}
                        className="w-full"
                      />
                    </div>
                  )}

                  {/* Logo Scale */}
                  {labelData.showLogo && labelData.logoUrl && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="logo-scale">Logo Size</Label>
                        <span className="text-sm text-muted-foreground">{labelData.logoScale}%</span>
                      </div>
                      <Slider
                        id="logo-scale"
                        min={25}
                        max={200}
                        step={5}
                        value={[labelData.logoScale]}
                        onValueChange={(value) => setLabelData(prev => ({ ...prev, logoScale: value[0] }))}
                        className="w-full"
                      />
                    </div>
                  )}

                  {/* Size Indicator Scale */}
                  {labelData.showSize && labelData.sizeIndicator && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="size-indicator-scale">Size Indicator Size</Label>
                        <span className="text-sm text-muted-foreground">{labelData.sizeIndicatorScale}%</span>
                      </div>
                      <Slider
                        id="size-indicator-scale"
                        min={25}
                        max={200}
                        step={5}
                        value={[labelData.sizeIndicatorScale]}
                        onValueChange={(value) => setLabelData(prev => ({ ...prev, sizeIndicatorScale: value[0] }))}
                        className="w-full"
                      />
                    </div>
                  )}

                  {/* Message Scale */}
                  {labelData.showMessage && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="message-scale">Message Size</Label>
                        <span className="text-sm text-muted-foreground">{labelData.messageScale}%</span>
                      </div>
                      <Slider
                        id="message-scale"
                        min={25}
                        max={200}
                        step={5}
                        value={[labelData.messageScale]}
                        onValueChange={(value) => setLabelData(prev => ({ ...prev, messageScale: value[0] }))}
                        className="w-full"
                      />
                    </div>
                  )}

                  {/* Member Scale */}
                  {labelData.showMember && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="member-scale">MEMBER Size</Label>
                        <span className="text-sm text-muted-foreground">{labelData.memberScale}%</span>
                      </div>
                      <Slider
                        id="member-scale"
                        min={25}
                        max={200}
                        step={5}
                        value={[labelData.memberScale]}
                        onValueChange={(value) => setLabelData(prev => ({ ...prev, memberScale: value[0] }))}
                        className="w-full"
                        data-testid="slider-member-scale"
                      />
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}