import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { StatusBar } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { ScreenOrientation } from '@capacitor/screen-orientation';

export const useMobile = () => {
  useEffect(() => {
    const initMobile = async () => {
      // Hide splash screen after app loads
      await SplashScreen.hide();
      
      // Hide status bar for immersive experience
      await StatusBar.hide();
      
      // Force landscape orientation for mobile
      try {
        await ScreenOrientation.lock({ orientation: 'landscape' });
        console.log('Screen orientation locked to landscape');
      } catch (error) {
        console.log('Failed to lock screen orientation:', error);
        
        // Fallback to web API
        try {
          const screen = window.screen as any;
          if (screen && screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock('landscape');
          }
        } catch (fallbackError) {
          console.log('Web orientation lock also failed:', fallbackError);
        }
      }
      
      // Handle hardware back button
      App.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          App.exitApp();
        }
      });
      
      // Add mobile-specific CSS classes
      document.body.classList.add('mobile-app');
      document.documentElement.classList.add('mobile-app');
      
      // Ensure viewport meta tag is optimized for landscape
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
      }
    };

    // Check if we're in Capacitor (mobile app)
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      initMobile();
    }
  }, []);
};

// Helper function to check if running in mobile app
export const isMobileApp = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).Capacitor;
};

