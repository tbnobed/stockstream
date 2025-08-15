import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, X, Flashlight } from "lucide-react";

interface QRScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function QRScanner({ onScan, onClose, isOpen }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    if (isOpen) {
      startScanning();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isOpen]);

  const startScanning = async () => {
    console.log("Starting QR scanner...");
    try {
      setError(null);
      setIsScanning(true);

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera access not supported on this device");
      }

      console.log("Requesting camera permission...");
      
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment", // Use back camera by default
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      console.log("Camera permission granted, setting up video stream...");
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to load before starting decoder
        videoRef.current.onloadedmetadata = () => {
          console.log("Video loaded, initializing QR code reader...");
          
          // Initialize the code reader
          if (!codeReader.current) {
            codeReader.current = new BrowserMultiFormatReader();
          }
          
          // Start decoding from video element
          codeReader.current.decodeFromVideoDevice(
            null,
            videoRef.current!,
            (result, err) => {
              if (result) {
                console.log("QR Code detected:", result.getText());
                onScan(result.getText());
                stopScanning();
              }
              if (err && !(err instanceof NotFoundException)) {
                console.error("QR Code scan error:", err);
              }
            }
          );
        };
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setHasPermission(false);
      
      if (err.name === 'NotAllowedError') {
        setError("Camera permission denied. Please allow camera access and try again.");
      } else if (err.name === 'NotFoundError') {
        setError("No camera found on this device.");
      } else if (err.message?.includes('not supported')) {
        setError("Camera access is not supported on this device or browser.");
      } else {
        setError(`Unable to access camera: ${err.message || 'Unknown error'}`);
      }
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (codeReader.current) {
      codeReader.current.reset();
    }
    
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    setIsScanning(false);
  };

  const toggleFlashlight = async () => {
    try {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities() as any;
        
        if (capabilities.torch) {
          const settings = track.getSettings() as any;
          await track.applyConstraints({
            advanced: [{ torch: !settings.torch } as any]
          });
        }
      }
    } catch (err) {
      console.error("Flashlight toggle error:", err);
    }
  };

  console.log("QR Scanner render - isOpen:", isOpen, "isScanning:", isScanning, "hasPermission:", hasPermission, "error:", error);
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] p-4">
      <Card className="w-full max-w-md bg-background">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Scan QR Code</h3>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="close-scanner">
              <X size={20} />
            </Button>
          </div>

          {error ? (
            <div className="text-center py-8">
              <div className="text-red-500 mb-4">{error}</div>
              <div className="space-y-2">
                <Button onClick={startScanning} className="w-full" data-testid="retry-camera">
                  <Camera className="mr-2" size={16} />
                  Try Again
                </Button>
                {hasPermission === false && (
                  <p className="text-sm text-muted-foreground">
                    Go to your browser settings to enable camera permissions for this site.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  playsInline
                  data-testid="scanner-video"
                />
                
                {/* Scanning overlay */}
                <div className="absolute inset-0 border-2 border-white opacity-50 rounded-lg">
                  <div className="absolute top-4 left-4 w-8 h-8 border-l-4 border-t-4 border-primary"></div>
                  <div className="absolute top-4 right-4 w-8 h-8 border-r-4 border-t-4 border-primary"></div>
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-l-4 border-b-4 border-primary"></div>
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-r-4 border-b-4 border-primary"></div>
                </div>
                
                {isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black bg-opacity-50 text-white px-4 py-2 rounded">
                      Point camera at QR code
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={toggleFlashlight}
                  className="flex-1"
                  data-testid="toggle-flashlight"
                >
                  <Flashlight size={16} className="mr-2" />
                  Flash
                </Button>
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className="flex-1"
                  data-testid="cancel-scan"
                >
                  Cancel
                </Button>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                Position the QR code within the frame to scan
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}