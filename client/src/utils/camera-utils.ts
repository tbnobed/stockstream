// Camera utility functions for better device compatibility

export interface CameraInfo {
  hasCamera: boolean;
  cameraCount: number;
  hasBackCamera: boolean;
  hasFrontCamera: boolean;
  permissions: 'granted' | 'denied' | 'prompt' | 'unknown';
  supportedConstraints: MediaTrackSupportedConstraints | null;
}

export async function getCameraInfo(): Promise<CameraInfo> {
  const info: CameraInfo = {
    hasCamera: false,
    cameraCount: 0,
    hasBackCamera: false,
    hasFrontCamera: false,
    permissions: 'unknown',
    supportedConstraints: null
  };

  try {
    // Check if media devices are supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return info;
    }

    // Get supported constraints
    info.supportedConstraints = navigator.mediaDevices.getSupportedConstraints();

    // Check permissions
    if (navigator.permissions) {
      try {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        info.permissions = permission.state;
      } catch (permErr) {
        console.warn("Could not check camera permissions:", permErr);
      }
    }

    // Enumerate devices
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      info.cameraCount = videoDevices.length;
      info.hasCamera = videoDevices.length > 0;

      // Try to detect camera types (this is approximate)
      for (const device of videoDevices) {
        const label = device.label.toLowerCase();
        if (label.includes('back') || label.includes('rear') || label.includes('environment')) {
          info.hasBackCamera = true;
        } else if (label.includes('front') || label.includes('user') || label.includes('selfie')) {
          info.hasFrontCamera = true;
        }
      }

      // If we can't tell from labels, assume first camera is back, second is front
      if (videoDevices.length > 0 && !info.hasBackCamera && !info.hasFrontCamera) {
        info.hasBackCamera = true;
        if (videoDevices.length > 1) {
          info.hasFrontCamera = true;
        }
      }

    } catch (enumErr) {
      console.warn("Could not enumerate devices:", enumErr);
    }

  } catch (err) {
    console.error("Error getting camera info:", err);
  }

  return info;
}

export function getBrowserInfo(): { name: string; version: string; mobile: boolean } {
  const ua = navigator.userAgent;
  
  let browser = 'unknown';
  let version = 'unknown';
  
  if (ua.includes('Chrome')) {
    browser = 'chrome';
    const match = ua.match(/Chrome\/(\d+)/);
    if (match) version = match[1];
  } else if (ua.includes('Firefox')) {
    browser = 'firefox';
    const match = ua.match(/Firefox\/(\d+)/);
    if (match) version = match[1];
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    browser = 'safari';
    const match = ua.match(/Version\/(\d+)/);
    if (match) version = match[1];
  } else if (ua.includes('Edge')) {
    browser = 'edge';
    const match = ua.match(/Edge\/(\d+)/);
    if (match) version = match[1];
  }

  const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  
  return { name: browser, version, mobile };
}