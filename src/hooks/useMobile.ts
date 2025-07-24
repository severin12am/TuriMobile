import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { StatusBar } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

export const useMobile = () => {
  useEffect(() => {
    const initMobile = async () => {
      try {
        // Check if we're in Capacitor (mobile app)
        if (typeof window !== 'undefined' && (window as any).Capacitor) {
          // Hide splash screen after app loads
          await SplashScreen.hide();
          
          // Hide status bar for full screen experience
          await StatusBar.hide();
          
          // Handle hardware back button
          App.addListener('backButton', ({ canGoBack }) => {
            if (!canGoBack) {
              App.exitApp();
            }
          });
          
          // Add mobile-specific CSS classes
          document.body.classList.add('mobile-app');
          document.documentElement.classList.add('mobile-app');
          
          // Ensure viewport meta tag is optimized for mobile
          const viewport = document.querySelector('meta[name="viewport"]');
          if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
          }
        }
      } catch (error) {
        console.log('Mobile initialization error:', error);
      }
    };

    initMobile();
  }, []);
};

// Helper function to check if running in mobile app
export const isMobileApp = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).Capacitor;
};

