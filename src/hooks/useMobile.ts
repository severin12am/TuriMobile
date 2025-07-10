import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { StatusBar } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

export const useMobile = () => {
  useEffect(() => {
    const initMobile = async () => {
      // Hide splash screen after app loads
      await SplashScreen.hide();
      
      // Hide status bar for immersive experience
      await StatusBar.hide();
      
      // Handle hardware back button
      App.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          App.exitApp();
        }
      });
    };

    // Check if we're in Capacitor (mobile app)
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      initMobile();
    }
  }, []);
};

