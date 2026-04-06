import { useState, useEffect, useCallback } from 'react';

export interface AccelerometerData {
  x: number;
  y: number;
  z: number;
  magnitude: number;
}

export function useAccelerometer() {
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [data, setData] = useState<AccelerometerData>({ x: 0, y: 0, z: 0, magnitude: 0 });
  const [isSupported, setIsSupported] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.DeviceMotionEvent) {
      setIsSupported(false);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permissionState = await (DeviceMotionEvent as any).requestPermission();
        if (permissionState === 'granted') {
          setPermissionGranted(true);
          return true;
        } else {
          setPermissionGranted(false);
          return false;
        }
      } catch (error) {
        console.error('Error requesting device motion permission:', error);
        setPermissionGranted(false);
        return false;
      }
    } else {
      // Non-iOS 13+ devices
      setPermissionGranted(true);
      return true;
    }
  }, []);

  useEffect(() => {
    if (!permissionGranted) return;

    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.acceleration || event.accelerationIncludingGravity;
      if (!acc) return;

      const x = acc.x || 0;
      const y = acc.y || 0;
      const z = acc.z || 0;

      // Calculate magnitude of acceleration
      // If using accelerationIncludingGravity, stationary magnitude is ~9.8
      // We'll just provide the raw magnitude and let the app handle the baseline
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      setData({ x, y, z, magnitude });
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [permissionGranted]);

  return { data, permissionGranted, requestPermission, isSupported };
}
