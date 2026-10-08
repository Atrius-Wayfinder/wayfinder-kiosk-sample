/**
 * TabRail Component
 *
 * Folder-style tabs on the right edge holding the kiosk's preference controls:
 * accessibility, language, and take-this-map-to-your-phone. Each tab is compact until
 * tapped, then slides a drawer out to the left.
 *
 * The tabs are translucent and float over the content. Anything that would otherwise
 * sit underneath them - the map SDK's right-hand controls and the idle screen's
 * wait-times panel - is shifted left by --rail-w in index.css, so the map still runs
 * edge to edge but no control is ever covered.
 *
 * Rendered inside the app root, so reach mode moves it into the reachable area too.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { useKioskStore } from '@/store/kioskStore';
import { wayfinderService, audioService } from '@/services';
import { config } from '@/config';
import { AccessibilityOptions } from './AccessibilityOptions';

type TabId = 'access' | 'language' | 'phone';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
] as const;

export const TabRail: React.FC = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState<TabId | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const railRef = useRef<HTMLDivElement>(null);

  const language = useKioskStore((s) => s.language);
  const setLanguage = useKioskStore((s) => s.setLanguage);
  const isMapReady = useKioskStore((s) => s.isMapReady);
  const isMapVisible = useKioskStore((s) => s.isMapVisible);
  const currentView = useKioskStore((s) => s.currentView);

  const showPhoneTab = isMapReady && isMapVisible;
  // No language switching while the map is open: the map SDK only fully picks up a
  // language change when it reloads, which would throw away the traveller's route
  // and view. Language is chosen on the other screens instead.
  const showLanguageTab = !isMapVisible;

  // Close on a tap anywhere outside the rail (tabs and drawers), on Escape, and when
  // the view changes - which includes the inactivity reset back to idle.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!railRef.current?.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => setOpen(null), [currentView, isMapVisible]);

  // Build the take-map URL when the phone drawer opens, same as TakeMapButton.
  useEffect(() => {
    if (open !== 'phone') return;
    setQrUrl(null);
    setQrError(null);
    const map = wayfinderService.getInstance();
    if (!map || !config.mapQrBaseUrl) {
      setQrError(t('rail.phoneNotConfigured'));
      return;
    }
    (map as any)
      .getState()
      .then((state: string) => setQrUrl(`${config.mapQrBaseUrl}?s=${state}`))
      .catch(() => setQrError(t('rail.phoneError')));
  }, [open, t]);

  const toggle = useCallback((id: TabId) => {
    audioService.click();
    setOpen((cur) => (cur === id ? null : id));
  }, []);

  const tabs: { id: TabId; icon: string; label: string }[] = [
    { id: 'access', icon: '♿', label: t('rail.access') },
    ...(showLanguageTab ? [{ id: 'language' as TabId, icon: '🌐', label: language.toUpperCase() }] : []),
    ...(showPhoneTab ? [{ id: 'phone' as TabId, icon: '📱', label: t('rail.phone') }] : []),
  ];

  const tabBase =
    'w-14 h-20 flex flex-col items-center justify-center gap-1 rounded-l-xl font-semibold text-xs ' +
    'transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400';
  const tabIdle =
    'bg-white/35 text-gray-900 backdrop-blur-md shadow-md border border-r-0 border-white/50 hover:bg-white/60';
  const tabActive = 'bg-white text-blue-700 shadow-xl';
  const drawerSurface = 'bg-white/85 backdrop-blur-md border border-white/70';

  return (
    <div
      ref={railRef}
      className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2"
      data-testid="tab-rail"
    >
      {tabs.map((tab) => {
        const isOpen = open === tab.id;
        return (
          <div key={tab.id} className="relative">
            <button
              onClick={() => toggle(tab.id)}
              aria-expanded={isOpen}
              aria-controls={`rail-drawer-${tab.id}`}
              className={`${tabBase} ${isOpen ? tabActive : tabIdle}`}
            >
              <span className="text-2xl leading-none" aria-hidden="true">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>

            {/* Drawer: always mounted so it can animate; inert while closed. */}
            <div
              id={`rail-drawer-${tab.id}`}
              role="region"
              aria-label={tab.label}
              aria-hidden={!isOpen}
              className={`absolute right-full top-1/2 mr-2 rounded-2xl shadow-2xl p-4
                transition-all duration-200 ease-out motion-reduce:transition-none ${drawerSurface}
                ${isOpen
                  ? 'opacity-100 -translate-y-1/2 translate-x-0'
                  : 'opacity-0 -translate-y-1/2 translate-x-6 pointer-events-none invisible'}`}
            >
              {tab.id === 'access' && <AccessibilityOptions />}

              {tab.id === 'language' && (
                <div className="flex flex-col gap-3 min-w-[12rem]">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        audioService.click();
                        setLanguage(l.code);
                      }}
                      aria-pressed={language === l.code}
                      className={`px-4 py-3 rounded-lg font-semibold text-left min-h-[48px] transition-colors ${
                        language === l.code
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              )}

              {tab.id === 'phone' && (
                <div className="w-56 text-center">
                  <p className="font-semibold text-gray-900 mb-3">
                    {t('rail.phoneHint')}
                  </p>
                  <div className="bg-white rounded-xl p-2 inline-block">
                    {qrUrl ? (
                      <QRCodeSVG value={qrUrl} size={176} level="M" />
                    ) : (
                      <div className="w-[176px] h-[176px] flex items-center justify-center text-sm text-gray-500">
                        {qrError ?? t('common.loading')}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TabRail;
