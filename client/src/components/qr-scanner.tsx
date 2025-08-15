import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, X, Flashlight, Settings } from "lucide-react";
import { CameraDiagnostic } from "./camera-diagnostic";

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
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

      // Check basic support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera access not supported on this device");
      }

      // Check if we're on HTTPS (required for camera access)
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        throw new Error("Camera access requires HTTPS connection");
      }

      console.log("Requesting camera permission...");
      
      // Get available devices first
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log("Available video devices:", videoDevices.map(d => ({ 
          deviceId: d.deviceId, 
          label: d.label || 'Unknown Camera',
          kind: d.kind 
        })));
        
        if (videoDevices.length === 0) {
          throw new Error("No cameras found on this device");
        }
      } catch (enumErr) {
        console.warn("Could not enumerate devices:", enumErr);
      }
      
      // Try different camera configurations with better error handling
      let stream: MediaStream | null = null;
      const errors: string[] = [];
      
      const configs = [
        // Back camera with high quality
        { 
          video: { 
            facingMode: { exact: "environment" },
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 }
          } 
        },
        // Back camera with medium quality
        { 
          video: { 
            facingMode: "environment",
            width: { ideal: 640 },
            height: { ideal: 480 }
          } 
        },
        // Front camera
        { 
          video: { 
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 }
          } 
        },
        // Any camera with basic resolution
        { 
          video: { 
            width: { min: 320, ideal: 640 },
            height: { min: 240, ideal: 480 }
          } 
        },
        // Minimal constraints - last resort
        { video: { width: 320, height: 240 } },
        { video: true }
      ];
      
      for (let i = 0; i < configs.length; i++) {
        const config = configs[i];
        try {
          console.log(`Attempting config ${i + 1}/${configs.length}:`, JSON.stringify(config));
          
          // Add timeout to prevent hanging
          const streamPromise = navigator.mediaDevices.getUserMedia(config);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Camera access timeout')), 10000)
          );
          
          stream = await Promise.race([streamPromise, timeoutPromise]) as MediaStream;
          
          if (stream && stream.getVideoTracks().length > 0) {
            const track = stream.getVideoTracks()[0];
            console.log("Camera stream obtained successfully!");
            console.log("Video track settings:", track.getSettings());
            console.log("Video track capabilities:", track.getCapabilities());
            break;
          } else {
            throw new Error("Stream obtained but no video tracks available");
          }
        } catch (configErr: any) {
          const errorMsg = configErr?.message || configErr?.name || configErr?.toString() || 'Unknown error';
          console.error(`Config ${i + 1} failed:`, errorMsg, configErr);
          errors.push(`Config ${i + 1}: ${errorMsg}`);
          
          // Clean up any partial stream
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
          }
          
          continue;
        }
      }
      
      if (!stream) {
        const errorSummary = errors.length > 0 ? errors.join('; ') : 'All camera configurations failed';
        throw new Error(`Unable to access camera. Tried ${configs.length} configurations. Errors: ${errorSummary}`);
      }

      console.log("Camera permission granted, setting up video stream...");
      setHasPermission(true);
      
      // Store stream reference for monitoring
      streamRef.current = stream;

      if (videoRef.current) {
        console.log("Setting video stream...");
        videoRef.current.srcObject = stream;
        
        // Setup video element with stable configuration
        const setupVideo = () => {
          if (!videoRef.current) return;
          
          const video = videoRef.current;
          
          // Set critical attributes before assigning stream
          video.muted = true;
          video.playsInline = true;
          video.autoplay = true;
          video.controls = false;
          video.disablePictureInPicture = true;
          video.preload = "none";
          
          // Prevent browser from pausing video
          video.setAttribute('webkit-playsinline', 'true');
          video.setAttribute('playsinline', 'true');
          video.setAttribute('disablePictureInPicture', 'true');
          
          // Set video style to prevent layout shifts - no mirroring for better QR aiming
          video.style.objectFit = 'cover';
          video.style.width = '100%';
          video.style.height = '100%';
          
          console.log("Video element configured for stability");
        };
        
        const playVideo = async () => {
          if (!videoRef.current) return;
          
          const video = videoRef.current;
          setupVideo();
          
          // Force immediate play without waiting
          const forcePlay = async () => {
            try {
              // Some browsers require user gesture, but try anyway
              const playPromise = video.play();
              if (playPromise) {
                await playPromise;
              }
              console.log("Video play initiated successfully");
            } catch (err) {
              console.warn("Initial play failed, video may still work:", err);
            }
          };
          
          // Start playing immediately
          await forcePlay();
          
          // Start QR detection after a short delay regardless of play status
          setTimeout(() => {
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              console.log("Video ready with dimensions:", video.videoWidth, "x", video.videoHeight);
              setIsScanning(true);
              startQRDecoding();
            } else {
              console.log("Starting QR detection without confirmed dimensions");
              setIsScanning(true);
              startQRDecoding();
            }
          }, 1200); // Increased delay to reduce flickering
        };
        
        // Initialize the code reader immediately
        if (!codeReader.current) {
          codeReader.current = new BrowserMultiFormatReader();
        }
        
        // Simplified event handling - just start playing as soon as possible
        const video = videoRef.current;
        
        video.addEventListener('loadedmetadata', () => {
          console.log("Metadata loaded, starting video immediately");
          playVideo();
        });
        
        // Also try to start after a short delay regardless of events
        setTimeout(() => {
          console.log("Timeout fallback - starting video");
          playVideo();
        }, 1500); // Increased delay to prevent multiple initialization attempts
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setHasPermission(false);
      
      // More specific error handling based on common issues
      if (err.name === 'NotAllowedError') {
        setError("Camera permission denied. Please allow camera access in your browser settings and refresh the page.");
      } else if (err.name === 'NotFoundError') {
        setError("No camera found on this device.");
      } else if (err.name === 'OverconstrainedError') {
        setError("Camera constraints not supported. Your device's camera may have limited capabilities.");
      } else if (err.message?.includes('Starting videoinput failed')) {
        setError("Camera access is blocked. This can happen due to browser security settings, system permissions, or hardware restrictions. Please try: 1) Refresh the page, 2) Check browser camera permissions, 3) Try a different browser.");
      } else if (err.message?.includes('not supported')) {
        setError("Camera access is not supported in this browser. Try using Chrome, Firefox, or Safari.");
      } else if (err.message?.includes('timeout')) {
        setError("Camera access timed out. Please check your camera connection and try again.");
      } else {
        const errorMsg = err.message || err.toString() || 'Unknown camera error';
        setError(`Unable to access camera: ${errorMsg}. Try refreshing the page or using manual input below.`);
      }
      console.error("Full error object:", err);
      setIsScanning(false);
    }
  };

  const restartStream = async () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    
    console.log("Restarting camera stream...");
    
    // Clean up current stream
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    // Wait longer to prevent rapid restart cycles that cause flickering
    retryTimeoutRef.current = setTimeout(async () => {
      try {
        await startScanning();
      } catch (err) {
        console.error("Failed to restart stream:", err);
        setError("Camera connection lost. Please try again or use manual input.");
      }
    }, 2000); // Increased delay to prevent flickering
  };

  const startQRDecoding = () => {
    if (!videoRef.current || !codeReader.current) {
      console.warn("Cannot start QR decoding - missing video or code reader");
      return;
    }
    
    const video = videoRef.current;
    
    // Only start if video has proper dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.warn("Video has no dimensions, retrying in 500ms");
      setTimeout(startQRDecoding, 500);
      return;
    }
    
    console.log("Starting QR code detection on video:", video.videoWidth, "x", video.videoHeight);
    
    // Clear any existing interval
    if ((video as any).__scanInterval) {
      clearInterval((video as any).__scanInterval);
    }
    
    // Simple continuous decoding - less aggressive checking
    const scanInterval = setInterval(async () => {
      if (video && video.readyState >= 2 && video.videoWidth > 0) { // Only scan when video is ready
        try {
          const result = await codeReader.current!.decodeOnceFromVideoDevice(undefined, video);
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
    }, 1000); // Increased to 1000ms to reduce strain and flickering
    
    // Store interval reference to clean up later
    (video as any).__scanInterval = scanInterval;
  };

  const stopScanning = () => {
    console.log("Stopping QR scanner...");
    
    // Clear retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log("Stopped track:", track.kind);
      });
      streamRef.current = null;
    }
    
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject = null;
    }
    
    setIsScanning(false);
    setHasPermission(null);
    setError(null);
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
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[99999] p-4" onClick={onClose}>
      <Card className="w-full max-w-md bg-background" onClick={(e) => e.stopPropagation()}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Scan QR Code</h3>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="close-scanner">
              <X size={20} />
            </Button>
          </div>

          {error ? (
            <div className="text-center py-4">
              <div className="text-red-500 mb-4">{error}</div>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button onClick={startScanning} className="flex-1" data-testid="retry-camera">
                    <Camera className="mr-2" size={16} />
                    Try Again
                  </Button>
                  <Button 
                    onClick={() => setShowDiagnostic(true)} 
                    variant="outline"
                    data-testid="camera-diagnostic"
                  >
                    <Settings className="mr-2" size={16} />
                    Diagnose
                  </Button>
                </div>
                
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Or enter the QR code manually:
                  </p>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Type or paste QR code here"
                      className="flex-1 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          onScan(e.currentTarget.value.trim());
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={(e) => {
                        const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                        if (input.value.trim()) {
                          onScan(input.value.trim());
                        }
                      }}
                    >
                      Enter
                    </Button>
                  </div>
                </div>
                
                {hasPermission === false && (
                  <p className="text-xs text-muted-foreground">
                    Camera permissions may need to be enabled in browser settings.
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
                  controls={false}
                  data-testid="scanner-video"
                  onLoadedData={() => console.log("Video data loaded")}
                  onLoadedMetadata={() => console.log("Video metadata loaded")}
                  onCanPlay={() => console.log("Video can play")}
                  onPlay={() => console.log("Video started playing")}
                  onError={(e) => console.error("Video element error:", e)}
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
              
              <div className="text-center pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-2">
                  Or enter the code manually:
                </p>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Type or paste QR code here"
                    className="flex-1 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        onScan(e.currentTarget.value.trim());
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={(e) => {
                      const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                      if (input.value.trim()) {
                        onScan(input.value.trim());
                      }
                    }}
                  >
                    Enter
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
      
      {showDiagnostic && (
        <CameraDiagnostic onClose={() => setShowDiagnostic(false)} />
      )}
    </div>
  );
}