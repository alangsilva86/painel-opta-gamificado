import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

interface AudioContextValue {
  muted: boolean;
  toggleMute: () => void;
  playSale: () => void;
  playMeta: () => void;
  playSuperMeta: () => void;
  playBadge: () => void;
}

const AudioContextReact = createContext<AudioContextValue | null>(null);

function ensureAudioContext(ref: React.MutableRefObject<AudioContext | null>) {
  if (typeof window === "undefined") return null;
  if (!ref.current) {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    ref.current = new Ctx();
  }
  return ref.current;
}

function playToneSequence(
  ref: React.MutableRefObject<AudioContext | null>,
  muted: boolean,
  tones: Array<{ frequency: number; duration: number; delay?: number }>
) {
  if (muted) return;
  const ctx = ensureAudioContext(ref);
  if (!ctx) return;

  let currentTime = ctx.currentTime;
  tones.forEach((tone) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = tone.frequency;
    gain.gain.value = 0.15; // volume um pouco mais alto

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    const startAt = currentTime + (tone.delay || 0);
    oscillator.start(startAt);
    oscillator.stop(startAt + tone.duration);

    currentTime = startAt + tone.duration;
  });
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [muted, setMuted] = useState<boolean>(() => {
    const saved = localStorage.getItem("audio-muted");
    return saved ? saved === "true" : false;
  });
  const audioRef = useRef<AudioContext | null>(null);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      localStorage.setItem("audio-muted", (!prev).toString());
      console.log("[Audio] toggleMute ->", !prev);
      return !prev;
    });
  }, []);

  const playSale = useCallback(() => {
    console.log("[Audio] playSale (muted=", muted, ")");
    playToneSequence(audioRef, muted, [
      { frequency: 880, duration: 0.14 },
      { frequency: 660, duration: 0.12, delay: 0.03 },
      { frequency: 1040, duration: 0.16, delay: 0.05 },
      { frequency: 1320, duration: 0.18, delay: 0.08 }, // final mais festivo
    ]);
  }, [muted]);

  const playMeta = useCallback(() => {
    console.log("[Audio] playMeta (muted=", muted, ")");
    playToneSequence(audioRef, muted, [
      { frequency: 600, duration: 0.12 },
      { frequency: 900, duration: 0.14, delay: 0.03 },
      { frequency: 1200, duration: 0.18, delay: 0.05 },
      { frequency: 1500, duration: 0.2, delay: 0.08 },
    ]);
  }, [muted]);

  const playSuperMeta = useCallback(() => {
    console.log("[Audio] playSuperMeta (muted=", muted, ")");
    playToneSequence(audioRef, muted, [
      { frequency: 500, duration: 0.14 },
      { frequency: 900, duration: 0.16, delay: 0.05 },
      { frequency: 1400, duration: 0.22, delay: 0.1 },
      { frequency: 1800, duration: 0.18, delay: 0.12 },
      { frequency: 2000, duration: 0.22, delay: 0.15 }, // auge
    ]);
  }, [muted]);

  const playBadge = useCallback(() => {
    console.log("[Audio] playBadge (muted=", muted, ")");
    playToneSequence(audioRef, muted, [
      { frequency: 750, duration: 0.12 },
      { frequency: 950, duration: 0.14, delay: 0.05 },
      { frequency: 1150, duration: 0.14, delay: 0.08 },
    ]);
  }, [muted]);

  const value = useMemo(
    () => ({
      muted,
      toggleMute,
      playSale,
      playMeta,
      playSuperMeta,
      playBadge,
    }),
    [muted, toggleMute, playBadge, playMeta, playSale, playSuperMeta]
  );

  // Expor no window para facilitar testes manuais (console)
  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as any).__appAudio = value;
    return () => {
      delete (window as any).__appAudio;
    };
  }, [value]);

  return <AudioContextReact.Provider value={value}>{children}</AudioContextReact.Provider>;
}

export function useAudio() {
  const ctx = useContext(AudioContextReact);
  if (!ctx) {
    throw new Error("useAudio must be used within AudioProvider");
  }
  return ctx;
}
