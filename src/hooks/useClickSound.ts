import { useCallback } from "react";
import { getSoundSettings, SoundType } from "./useSoundSettings";

let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

// Sound configurations for different sound types
const soundConfigs: Record<SoundType, { frequency: number; type: OscillatorType; duration: number; attack?: number }> = {
  beep: { frequency: 1200, type: "sine", duration: 0.14 },
  pop: { frequency: 800, type: "sine", duration: 0.08 },
  click: { frequency: 1800, type: "square", duration: 0.05 },
  chime: { frequency: 1400, type: "triangle", duration: 0.2 },
  tap: { frequency: 600, type: "sine", duration: 0.06 },
  ding: { frequency: 1000, type: "sine", duration: 0.25, attack: 0.01 },
  touch: { frequency: 1600, type: "sine", duration: 0.035, attack: 0.005 }, // Banco Itaú style touch
};

const playTone = (ctx: AudioContext, volume: number, soundType: SoundType) => {
  const config = soundConfigs[soundType] || soundConfigs.beep;
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.value = config.frequency;
  oscillator.type = config.type;

  // Normalize volume (0-100) to gain (0-1)
  const normalizedVolume = (volume / 100) * 0.8;
  
  if (config.attack) {
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(normalizedVolume, ctx.currentTime + config.attack);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + config.duration);
  } else {
    gainNode.gain.setValueAtTime(normalizedVolume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + config.duration);
  }

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + config.duration);
};

const playClickSoundImpl = () => {
  try {
    const settings = getSoundSettings();
    
    // Check if sound is enabled
    if (!settings.enabled) {
      return;
    }

    const ctx = getAudioContext();

    // Must be called inside a user gesture on iOS.
    if (ctx.state === "suspended") {
      // Fire-and-forget; don't await/then (can break gesture context)
      ctx.resume();
    }

    playTone(ctx, settings.volume, settings.soundType);
  } catch {
    // ignore
  }
};

// Som de notificação (dois tons)
const playNotificationSoundImpl = () => {
  try {
    const settings = getSoundSettings();
    
    // Check if notification sound is enabled
    if (!settings.notificationSoundEnabled) {
      return;
    }

    const ctx = getAudioContext();

    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const normalizedVolume = (settings.volume / 100) * 0.6;
    
    // First tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.value = 880;
    osc1.type = "sine";
    gain1.gain.setValueAtTime(normalizedVolume, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.15);

    // Second tone (higher)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 1320;
    osc2.type = "sine";
    gain2.gain.setValueAtTime(0, ctx.currentTime);
    gain2.gain.setValueAtTime(normalizedVolume, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.3);
  } catch {
    // ignore
  }
};

export const useClickSound = () => {
  const playClickSound = useCallback(() => {
    playClickSoundImpl();
  }, []);

  return { playClickSound };
};

// Função global para uso sem hook
export const playClickSound = () => {
  playClickSoundImpl();
};

// Função global para som de notificação
export const playNotificationSound = () => {
  playNotificationSoundImpl();
};

