/**
 * AccessibilityOptions Component
 * The accessibility toggles (high contrast, large text, reach mode, audio feedback),
 * shown in the Access drawer of the TabRail.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useKioskStore } from '@/store/kioskStore';
import { audioService } from '@/services';

export const AccessibilityOptions: React.FC = () => {
  const { t } = useTranslation();
  const userPreferences = useKioskStore((state) => state.userPreferences);
  const setUserPreferences = useKioskStore((state) => state.setUserPreferences);

  const handleHighContrastToggle = () => {
    audioService.click();
    setUserPreferences({
      accessibility: {
        ...userPreferences.accessibility,
        highContrast: !userPreferences.accessibility.highContrast,
      },
    });
    // Body class is applied by App.tsx useEffect (single source of truth)
  };

  const handleLargeTextToggle = () => {
    audioService.click();
    setUserPreferences({
      accessibility: {
        ...userPreferences.accessibility,
        largeText: !userPreferences.accessibility.largeText,
      },
    });
    // Body class is applied by App.tsx useEffect (single source of truth)
  };

  const handleReachModeToggle = () => {
    audioService.click();
    setUserPreferences({
      accessibility: {
        ...userPreferences.accessibility,
        reachMode: !userPreferences.accessibility.reachMode,
      },
    });
    // Body class is applied by App.tsx useEffect (single source of truth)
  };

  const handleAudioToggle = () => {
    audioService.click();
    setUserPreferences({
      audioEnabled: !userPreferences.audioEnabled,
    });
  };

  return (
    <div className="flex flex-col gap-4 min-w-max">
      {/* High Contrast Button */}
      <button
        onClick={handleHighContrastToggle}
        aria-pressed={userPreferences.accessibility.highContrast}
        aria-label={
          userPreferences.accessibility.highContrast
            ? 'High contrast mode enabled. Click to disable'
            : 'High contrast mode disabled. Click to enable'
        }
        className={`flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-colors min-h-[48px] ${
          userPreferences.accessibility.highContrast
            ? 'bg-gray-900 text-white'
            : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
        }`}
      >
        <span className="text-xl">◐</span>
        <span>{t('accessibility.highContrast')}</span>
      </button>

      {/* Large Text Button */}
      <button
        onClick={handleLargeTextToggle}
        aria-pressed={userPreferences.accessibility.largeText}
        aria-label={
          userPreferences.accessibility.largeText
            ? 'Large text mode enabled. Click to disable'
            : 'Large text mode disabled. Click to enable'
        }
        className={`flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-colors min-h-[48px] ${
          userPreferences.accessibility.largeText
            ? 'bg-gray-900 text-white'
            : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
        }`}
      >
        <span className="text-xl">A+</span>
        <span>{t('accessibility.largeText')}</span>
      </button>

      {/* Reach Mode Button */}
      <button
        onClick={handleReachModeToggle}
        aria-pressed={userPreferences.accessibility.reachMode}
        aria-label={
          userPreferences.accessibility.reachMode
            ? 'Reach mode enabled. Click to disable'
            : 'Reach mode disabled. Click to enable'
        }
        className={`flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-colors min-h-[48px] ${
          userPreferences.accessibility.reachMode
            ? 'bg-gray-900 text-white'
            : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
        }`}
      >
        <span className="text-xl" aria-hidden="true">⤓</span>
        <span>{t('accessibility.reachMode')}</span>
      </button>

      {/* Audio Feedback Button */}
      <button
        onClick={handleAudioToggle}
        aria-pressed={userPreferences.audioEnabled}
        aria-label={
          userPreferences.audioEnabled
            ? 'Audio feedback enabled. Click to disable'
            : 'Audio feedback disabled. Click to enable'
        }
        className={`flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-colors min-h-[48px] ${
          userPreferences.audioEnabled
            ? 'bg-gray-900 text-white'
            : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
        }`}
      >
        <span className="text-xl">🔊</span>
        <span>{t('accessibility.audioFeedback')}</span>
      </button>
    </div>
  );
};

export default AccessibilityOptions;
