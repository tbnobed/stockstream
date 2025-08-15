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
      
      // Request camera permission with simpler constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment"
        }
      });

      console.log("Camera permission granted, setting up video stream...");
      setHasPermission(true);

      if (videoRef.current) {
        console.log("Setting video stream...");
        videoRef.current.srcObject = stream;
        
        // Force video to play
        const playVideo = async () => {
          try {
            await videoRef.current!.play();
            console.log("Video is playing");
            setIsScanning(true);
          } catch (err) {
            console.error("Failed to play video:", err);
            setError("Failed to start camera preview");
          }
        };
        
        // Initialize the code reader immediately
        if (!codeReader.current) {
          codeReader.current = new BrowserMultiFormatReader();
        }
        
        // Wait for video to load and start playing
        videoRef.current.addEventListener('loadedmetadata', () => {
          console.log("Video metadata loaded, dimensions:", videoRef.current!.videoWidth, "x", videoRef.current!.videoHeight);
          playVideo();
        });
        
        videoRef.current.addEventListener('canplay', () => {
          console.log("Video can play");
          if (videoRef.current!.videoWidth > 0) {
            startQRDecoding();
          }
        });
        
        // Also try to play after a delay
        setTimeout(playVideo, 500);
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
        setError(`Unable to access camera: ${err.message || err.toString() || 'Unknown error'}`);
      }
      console.error("Full error object:", err);
      setIsScanning(false);
    }
  };

  const startQRDecoding = () => {
    if (!videoRef.current || !codeReader.current) return;
    
    console.log("Starting QR code detection...");
    
    // Start continuous decoding
    const scanInterval = setInterval(async () => {
      if (videoRef.current && videoRef.current.videoWidth > 0 && videoRef.current.readyState >= 2) {
        try {
          const result = await codeReader.current!.decodeOnceFromVideoDevice(undefined, videoRef.current);
          if (result) {
            console.log("QR Code detected:", result.getText());
            clearInterval(scanInterval);
            onScan(result.getText());
            stopScanning();
          }
        } catch (err: any) {
          // Ignore NotFoundException - it means no QR code was found in this frame
          if (!(err instanceof NotFoundException)) {
            console.warn("QR scan error:", err.message);
          }
        }
      }
    }, 1000); // Check every second
    
    // Store interval reference to clean up later
    (videoRef.current as any).__scanInterval = scanInterval;
  };

  const stopScanning = () => {
    console.log("Stopping QR scanner...");
    
    // Clear any scanning interval
    if (videoRef.current && (videoRef.current as any).__scanInterval) {
      clearInterval((videoRef.current as any).__scanInterval);
      (videoRef.current as any).__scanInterval = null;
    }
    
    // Stop the code reader
    if (codeReader.current) {
      try {
        codeReader.current.reset();
      } catch (err) {
        console.warn("Error stopping code reader:", err);
      }
    }
    
    // Stop video stream
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        track.stop();
        console.log("Stopped track:", track.kind);
      });
      videoRef.current.srcObject = null;
    }
    
    setIsScanning(false);
    setHasPermission(null);
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
                  className="w-full h-full object-cover transform scale-x-[-1]"
                  autoPlay
                  muted
                  playsInline
                  controls={false}
                  data-testid="scanner-video"
                  onLoadedData={() => console.log("Video data loaded")}
                  onError={(e) => console.error("Video error:", e)}
                  style={{ 
                    width: '100%', 
                    height: '100%',
                    objectFit: 'cover',
                    backgroundColor: 'black'
                  }}
                />
                
                {/* Scanning overlay */}
                <div className="absolute inset-0 border-2 border-white opacity-50 rounded-lg">
                  <div className="absolute top-4 left-4 w-8 h-8 border-l-4 border-t-4 border-primary"></div>
                  <div className="absolute top-4 right-4 w-8 h-8 border-r-4 border-t-4 border-primary"></div>
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-l-4 border-b-4 border-primary"></div>
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-r-4 border-b-4 border-primary"></div>
                </div>
                
                {isScanning && hasPermission && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black bg-opacity-50 text-white px-4 py-2 rounded text-sm">
                      Point camera at QR code
                    </div>
                  </div>
                )}
                
                {!isScanning && hasPermission && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black bg-opacity-50 text-white px-4 py-2 rounded text-sm">
                      Loading camera...
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