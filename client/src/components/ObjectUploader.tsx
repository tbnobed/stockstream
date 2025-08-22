import { useState, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
    uploadURL?: string;
    localFileName?: string;
    useObjectStorage?: boolean;
  }>;
  onComplete?: (result: { successful: Array<{ uploadURL: string; name: string; size: number; type: string }> }) => void;
  buttonClassName?: string;
  children: ReactNode;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleButtonClick = () => {
    console.log("Upload button clicked, opening file dialog...");
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    console.log("File selected:", file.name, file.size, file.type);

    // Validate file size
    if (file.size > maxFileSize) {
      toast({
        title: "File too large",
        description: `File must be smaller than ${Math.round(maxFileSize / 1024 / 1024)}MB`,
        variant: "destructive",
      });
      return;
    }

    // Validate file type (images only)
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (PNG, JPG, etc.)",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      console.log("Getting upload parameters...");
      const uploadParams = await onGetUploadParameters();
      console.log("Upload parameters received:", uploadParams);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);

      console.log("Uploading file to local storage...");
      
      // Get JWT token for authentication
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const uploadResponse = await fetch(uploadParams.url, {
        method: 'PUT',
        body: formData,
        headers,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text().catch(() => 'Unknown error');
        throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}. ${errorText}`);
      }

      const uploadResult = await uploadResponse.json();
      console.log("Upload successful!", uploadResult);

      // Call onComplete with the result, using localPath as uploadURL
      onComplete?.({
        successful: [{
          uploadURL: uploadResult.localPath || uploadParams.url,
          name: file.name,
          size: file.size,
          type: file.type
        }]
      });

      toast({
        title: "Upload successful",
        description: `${file.name} has been uploaded successfully.`,
      });

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <Button 
        onClick={handleButtonClick} 
        className={buttonClassName}
        disabled={isUploading}
        data-testid="upload-logo-button"
      >
        {isUploading ? "Uploading..." : children}
      </Button>

      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        multiple={maxNumberOfFiles > 1}
      />
    </div>
  );
}