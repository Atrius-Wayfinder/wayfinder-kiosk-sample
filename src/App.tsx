/**
 * Main App Component
 * Sets up routing and core layout for the Airport Wayfinder Kiosk
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useKioskStore } from '@/store/kioskStore';
import { useGlobalErrorHandler } from '@/hooks/useGlobalErrorHandler';
import { useInactivityTimer } from '@/hooks/useInactivityTimer';
import { directoryService, wayfinderService, audioService } from '@/services';
import { config } from '@/config';
import ErrorBoundary from '@/components/ErrorBoundary';
import IdleScreen from '@/components/IdleScreen';
import GateFinder from '@/components/GateFinder';
import Directory from '@/components/Directory';
import MapView from '@/components/MapView';
import TabRail from '@/components/TabRail';
import VirtualKeyboard from '@/components/VirtualKeyboard';
import { KeyboardProvider, useKeyboard } from '@/context/KeyboardContext';

/**
 * Renders the component for the current view
 */
const CurrentView: React.FC<{ view: string }> = ({ view }) => {
  switch (view) {
    case 'gate-finder':
      return <GateFinder />;
    case 'directory':
      return <Directory />;
    case 'idle':
    default:
      return <IdleScreen />;
  }
};

/**
 * Main application layout using state-based routing
 */
const AppLayout: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { keyboardDisabled } = useKeyboard();
  const currentView = useKioskStore((state) => state.currentView);
  const isMapVisible = useKioskStore((state) => state.isMapVisible);
  const isOffline = useKioskStore((state) => state.isOffline);
  const reset = useKioskStore((state) => state.reset);
  const userPreferences = useKioskStore((state) => state.userPreferences);

  // Stable callback for timeout
  const handleTimeout = useCallback(async () => {
    console.log('Inactivity timeout - returning to idle screen');

    // Reset the map to initial state with full cleanup
    await wayfinderService.resetToInitialState();

    // Reset application state to idle
    reset();
  }, [reset]);

  // Set up inactivity timer to return to idle screen
  useInactivityTimer({
    timeout: config.inactivityTimeout,
    onTimeout: handleTimeout,
    enabled: true,
  });

  // Apply accessibility classes to body based on user preferences
  useEffect(() => {
    document.body.classList.toggle('high-contrast', userPreferences.accessibility.highContrast);
    document.body.classList.toggle('large-text', userPreferences.accessibility.largeText);
  }, [userPreferences.accessibility.highContrast, userPreferences.accessibility.largeText]);

  // Reach mode resizes the app root, but the map canvas only re-measures on a window
  // resize - without this nudge it keeps drawing at its old height and is clipped.
  const reachMode = !!userPreferences.accessibility.reachMode;
  useEffect(() => {
    document.body.classList.toggle('reach-mode', reachMode);
    const frame = requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    return () => cancelAnimationFrame(frame);
  }, [reachMode]);

  // Sync UI and map language with store language
  useEffect(() => {
    // Update i18next language for kiosk UI
    i18n.changeLanguage(userPreferences.language);
    // Update map SDK language
    wayfinderService.setLanguage(userPreferences.language);
    // Update HTML lang attribute for accessibility
    document.documentElement.lang = userPreferences.language;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPreferences.language]);

  return (
    <>
    {/*
      Reach mode: the top third is out of reach for interaction, so it becomes display
      space. The pano is a placeholder showing venues the slot can carry advertising.
      The status pill stays small and in a corner so it doesn't compete with the image.
    */}
    {reachMode && (
      <div
        className="fixed top-0 left-0 right-0 h-[33.333dvh] bg-cover bg-no-repeat"
        style={{ backgroundImage: "url('/assets/ReachModePano.jpeg')", backgroundPosition: 'center 55%' }}
      >
        <div
          className="absolute bottom-3 right-4 px-3 py-1.5 rounded-full bg-black/60 text-white text-sm backdrop-blur-sm"
          role="status"
        >
          {t('accessibility.reachModeBanner')}
        </div>
      </div>
    )}

    {/* .reach-root is pinned to the lower two-thirds when reach mode is on (index.css) */}
    <div className="reach-root w-full h-full overflow-hidden bg-white">
      {/* Offline indicator */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white px-4 py-2 z-50 text-center">
          No internet connection
        </div>
      )}

      {/* Main content views */}
      <div className={isMapVisible ? 'hidden' : 'w-full h-full'}>
        <CurrentView view={currentView} />
      </div>

      {/* Always-mounted Map View, visibility controlled by CSS */}
      <div
        className={`absolute top-0 left-0 w-full h-full transition-opacity duration-300 ${
          isMapVisible ? 'opacity-100 z-20' : 'opacity-0 z-[-1]'
        }`}
      >
        <MapView />
      </div>

      {/* Right-edge tabs: accessibility, language, take-map-to-phone */}
      <TabRail />
    </div>

    {/*
      Virtual Keyboard sits outside .reach-root on purpose: it positions itself from
      viewport coordinates (getBoundingClientRect), which would be offset by a third
      of the screen if reach mode made the root its containing block.
    */}
    {!keyboardDisabled && <VirtualKeyboard />}
    </>
  );
};

/**
 * Root App Component
 * Wraps the application with error boundary and context providers
 */
export const App: React.FC = () => {
  const initRef = useRef(false);

  // Set up global error handler
  useGlobalErrorHandler({
    autoReloadDelay: 3000,
    shouldAutoReload: true,
  });

  // Initialize directory service (fetch and cache POIs) at app startup
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    // Preload audio files for faster playback
    audioService.preload();

    directoryService.initialize().catch((error) => {
      console.error('Failed to initialize directory service:', error);
    });
  }, []);

  // Set up online/offline listeners
  useEffect(() => {
    const handleOnline = () => {
      console.log('Back online');
      useKioskStore.setState({ isOffline: false });
    };

    const handleOffline = () => {
      console.log('Connection lost');
      useKioskStore.setState({ isOffline: true });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial online status
    if (!navigator.onLine) {
      useKioskStore.setState({ isOffline: true });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <ErrorBoundary>
      <KeyboardProvider>
        <AppLayout />
      </KeyboardProvider>
    </ErrorBoundary>
  );
};


export default App;
