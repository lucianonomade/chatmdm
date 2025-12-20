import { useState, useEffect, useCallback } from "react";

export type SoundType = "beep" | "pop" | "click" | "chime" | "tap" | "ding" | "touch";

export interface SoundSettings {
  enabled: boolean;
  volume: number; // 0-100
  soundType: SoundType;
  notificationSoundEnabled: boolean;
}

const STORAGE_KEY = "sound-settings";

const defaultSettings: SoundSettings = {
  enabled: true,
  volume: 60,
  soundType: "touch",
  notificationSoundEnabled: true,
};

// Load settings from localStorage
const loadSettings = (): SoundSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch {
    // ignore
  }
  return defaultSettings;
};

// Save settings to localStorage
const saveSettings = (settings: SoundSettings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
};

// Global state for sound settings
let globalSettings: SoundSettings = loadSettings();
let listeners: Set<() => void> = new Set();

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

export const getSoundSettings = (): SoundSettings => globalSettings;

export const useSoundSettings = () => {
  const [settings, setSettings] = useState<SoundSettings>(globalSettings);

  useEffect(() => {
    const listener = () => setSettings({ ...globalSettings });
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const updateSettings = useCallback((updates: Partial<SoundSettings>) => {
    globalSettings = { ...globalSettings, ...updates };
    saveSettings(globalSettings);
    notifyListeners();
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    updateSettings({ enabled });
  }, [updateSettings]);

  const setVolume = useCallback((volume: number) => {
    updateSettings({ volume: Math.max(0, Math.min(100, volume)) });
  }, [updateSettings]);

  const setSoundType = useCallback((soundType: SoundType) => {
    updateSettings({ soundType });
  }, [updateSettings]);

  const setNotificationSoundEnabled = useCallback((notificationSoundEnabled: boolean) => {
    updateSettings({ notificationSoundEnabled });
  }, [updateSettings]);

  return {
    settings,
    updateSettings,
    setEnabled,
    setVolume,
    setSoundType,
    setNotificationSoundEnabled,
  };
};
