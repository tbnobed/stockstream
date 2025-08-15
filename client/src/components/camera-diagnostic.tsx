import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Camera, CheckCircle, X } from "lucide-react";

interface DiagnosticResult {
  name: string;
  status: 'success' | 'warning' | 'error';
  message: string;
}

export function CameraDiagnostic({ onClose }: { onClose: () => void }) {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostic = async () => {
    setIsRunning(true);
    const diagnosticResults: DiagnosticResult[] = [];

    // Test 1: Browser support
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        diagnosticResults.push({
          name: "Browser Support",
          status: "success",
          message: "getUserMedia API is supported"
        });
      } else {
        diagnosticResults.push({
          name: "Browser Support",
          status: "error",
          message: "getUserMedia API is not supported in this browser"
        });
      }
    } catch (err) {
      diagnosticResults.push({
        name: "Browser Support",
        status: "error",
        message: "Error checking browser support"
      });
    }

    // Test 2: HTTPS requirement
    const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
    diagnosticResults.push({
      name: "Secure Connection",
      status: isSecure ? "success" : "error",
      message: isSecure ? "Connection is secure" : "Camera requires HTTPS connection"
    });

    // Test 3: Device enumeration
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(d => d.kind === 'videoinput');
        
        if (cameras.length > 0) {
          diagnosticResults.push({
            name: "Camera Detection",
            status: "success", 
            message: `Found ${cameras.length} camera(s)`
          });
        } else {
          diagnosticResults.push({
            name: "Camera Detection",
            status: "error",
            message: "No cameras detected on this device"
          });
        }
      }
    } catch (err) {
      diagnosticResults.push({
        name: "Camera Detection",
        status: "warning",
        message: "Could not enumerate devices"
      });
    }

    // Test 4: Permission check
    try {
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        diagnosticResults.push({
          name: "Camera Permission",
          status: permission.state === 'granted' ? "success" : "warning",
          message: `Permission state: ${permission.state}`
        });
      }
    } catch (err) {
      diagnosticResults.push({
        name: "Camera Permission",
        status: "warning",
        message: "Could not check camera permissions"
      });
    }

    // Test 5: Basic camera access
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      
      diagnosticResults.push({
        name: "Camera Access Test",
        status: "success",
        message: "Camera access successful!"
      });
    } catch (err: any) {
      diagnosticResults.push({
        name: "Camera Access Test", 
        status: "error",
        message: `Camera access failed: ${err.message || 'Unknown error'}`
      });
    }

    setResults(diagnosticResults);
    setIsRunning(false);
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <X className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Camera Diagnostic
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <CardDescription>
            Test your device's camera compatibility and permissions
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {results.length === 0 ? (
            <Button 
              onClick={runDiagnostic} 
              disabled={isRunning}
              className="w-full"
            >
              {isRunning ? "Running Tests..." : "Run Camera Diagnostic"}
            </Button>
          ) : (
            <div className="space-y-3">
              {results.map((result, i) => (
                <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                  {getStatusIcon(result.status)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{result.name}</p>
                    <p className="text-xs text-muted-foreground">{result.message}</p>
                  </div>
                </div>
              ))}
              
              <div className="flex gap-2 pt-2">
                <Button onClick={runDiagnostic} variant="outline" size="sm">
                  Run Again
                </Button>
                <Button onClick={onClose} size="sm">
                  Close
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}