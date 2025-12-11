import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

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
    gain.gain.value = 0.06;

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
      return !prev;
    });
  }, []);

  const playSale = useCallback(() => {
    playToneSequence(audioRef, muted, [
      { frequency: 880, duration: 0.08 },
      { frequency: 660, duration: 0.06, delay: 0.02 },
      { frequency: 1040, duration: 0.1, delay: 0.03 },
    ]);
  }, [muted]);

  const playMeta = useCallback(() => {
    playToneSequence(audioRef, muted, [
      { frequency: 600, duration: 0.08 },
      { frequency: 900, duration: 0.1, delay: 0.02 },
      { frequency: 1200, duration: 0.16, delay: 0.04 },
    ]);
  }, [muted]);

  const playSuperMeta = useCallback(() => {
    playToneSequence(audioRef, muted, [
      { frequency: 500, duration: 0.1 },
      { frequency: 900, duration: 0.12, delay: 0.04 },
      { frequency: 1400, duration: 0.18, delay: 0.08 },
      { frequency: 1800, duration: 0.12, delay: 0.1 },
    ]);
  }, [muted]);

  const playBadge = useCallback(() => {
    playToneSequence(audioRef, muted, [
      { frequency: 750, duration: 0.08 },
      { frequency: 950, duration: 0.08, delay: 0.04 },
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

  return <AudioContextReact.Provider value={value}>{children}</AudioContextReact.Provider>;
}

export function useAudio() {
  const ctx = useContext(AudioContextReact);
  if (!ctx) {
    throw new Error("useAudio must be used within AudioProvider");
  }
  return ctx;
}
