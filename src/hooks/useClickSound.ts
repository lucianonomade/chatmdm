import { useCallback, useEffect } from "react";
import { getSoundSettings, SoundType } from "./useSoundSettings";

// Pre-initialized audio context for instant playback
let audioContext: AudioContext | null = null;
let isContextReady = false;

// Pre-create oscillator nodes pool for instant sound
const initAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      latencyHint: "interactive", // Optimize for low latency
    });
  }
  return audioContext;
};

// Initialize context on first user interaction to avoid suspension
const ensureContextReady = () => {
  const ctx = initAudioContext();
  if (ctx.state === "suspended") {
    ctx.resume();
  }
  isContextReady = ctx.state === "running";
  return ctx;
};

// Pre-warm the audio context on first user interaction
const warmUpAudio = () => {
  if (isContextReady) return;
  
  const ctx = ensureContextReady();
  
  // Play a silent sound to fully activate the audio pipeline
  if (ctx.state === "running") {
    const silentOsc = ctx.createOscillator();
    const silentGain = ctx.createGain();
    silentGain.gain.value = 0;
    silentOsc.connect(silentGain);
    silentGain.connect(ctx.destination);
    silentOsc.start();
    silentOsc.stop(ctx.currentTime + 0.001);
    isContextReady = true;
  }
};

// Sound configurations for different sound types
const soundConfigs: Record<SoundType, { frequency: number; type: OscillatorType; duration: number; attack?: number }> = {
  beep: { frequency: 1200, type: "sine", duration: 0.14 },
  pop: { frequency: 800, type: "sine", duration: 0.08 },
  click: { frequency: 1800, type: "square", duration: 0.05 },
  chime: { frequency: 1400, type: "triangle", duration: 0.2 },
  tap: { frequency: 600, type: "sine", duration: 0.06 },
  ding: { frequency: 1000, type: "sine", duration: 0.25, attack: 0.01 },
  touch: { frequency: 1600, type: "sine", duration: 0.035, attack: 0.005 },
};

// Optimized immediate sound playback
const playToneImmediate = (ctx: AudioContext, volume: number, soundType: SoundType) => {
  const config = soundConfigs[soundType] || soundConfigs.beep;
  const now = ctx.currentTime;
  
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.value = config.frequency;
  oscillator.type = config.type;

  // Normalize volume (0-100) to gain (0-1)
  const normalizedVolume = (volume / 100) * 0.8;
  
  if (config.attack) {
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(normalizedVolume, now + config.attack);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + config.duration);
  } else {
    gainNode.gain.setValueAtTime(normalizedVolume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + config.duration);
  }

  // Start immediately
  oscillator.start(now);
  oscillator.stop(now + config.duration);
};

const playClickSoundImpl = () => {
  try {
    const settings = getSoundSettings();
    
    // Check if sound is enabled
    if (!settings.enabled) {
      return;
    }

    const ctx = initAudioContext();

    // Resume if suspended (shouldn't happen if warmed up)
    if (ctx.state === "suspended") {
      ctx.resume().then(() => {
        playToneImmediate(ctx, settings.volume, settings.soundType);
      });
      return;
    }

    // Play immediately
    playToneImmediate(ctx, settings.volume, settings.soundType);
  } catch {
    // ignore
  }
};

// Som de notificação (dois tons)
const playNotificationSoundImpl = () => {
  try {
    const settings = getSoundSettings();
    
    if (!settings.notificationSoundEnabled) {
      return;
    }

    const ctx = initAudioContext();

    if (ctx.state === "suspended") {
      ctx.resume();
      return;
    }

    const now = ctx.currentTime;
    const normalizedVolume = (settings.volume / 100) * 0.6;
    
    // First tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.value = 880;
    osc1.type = "sine";
    gain1.gain.setValueAtTime(normalizedVolume, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Second tone (higher)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 1320;
    osc2.type = "sine";
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(normalizedVolume, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.3);
  } catch {
    // ignore
  }
};

export const useClickSound = () => {
  // Warm up audio context on component mount
  useEffect(() => {
    // Add listeners for first user interaction to warm up audio
    const handleInteraction = () => {
      warmUpAudio();
      // Remove listeners after first interaction
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
      document.removeEventListener("keydown", handleInteraction);
    };

    document.addEventListener("click", handleInteraction, { passive: true });
    document.addEventListener("touchstart", handleInteraction, { passive: true });
    document.addEventListener("keydown", handleInteraction, { passive: true });

    return () => {
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
      document.removeEventListener("keydown", handleInteraction);
    };
  }, []);

  const playClickSound = useCallback(() => {
    playClickSoundImpl();
  }, []);

  return { playClickSound };
};

// Initialize audio on any user interaction (global listener)
if (typeof window !== "undefined") {
  const initOnInteraction = () => {
    warmUpAudio();
    document.removeEventListener("click", initOnInteraction);
    document.removeEventListener("touchstart", initOnInteraction);
  };
  document.addEventListener("click", initOnInteraction, { passive: true, once: true });
  document.addEventListener("touchstart", initOnInteraction, { passive: true, once: true });
}

// Função global para uso sem hook
export const playClickSound = () => {
  playClickSoundImpl();
};

// Função global para som de notificação
export const playNotificationSound = () => {
  playNotificationSoundImpl();
};

// Export warm up function for manual initialization
export const warmUpClickSound = () => {
  warmUpAudio();
};
