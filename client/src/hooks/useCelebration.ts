import confetti from "canvas-confetti";
import { useCallback } from "react";

function shouldReduceMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useCelebration() {
  const celebrate = useCallback((type: "small" | "medium" | "large" = "medium") => {
    if (shouldReduceMotion()) return;
    const configs = {
      small: {
        particleCount: 50,
        spread: 45,
        origin: { y: 0.7 },
      },
      medium: {
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      },
      large: {
        particleCount: 200,
        spread: 100,
        origin: { y: 0.5 },
      },
    };

    const config = configs[type];

    confetti({
      ...config,
      colors: ["#a855f7", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"],
      ticks: 200,
      gravity: 1,
      decay: 0.94,
      startVelocity: 30,
    });
  }, []);

  const celebrateMetaAlcancada = useCallback(() => {
    if (shouldReduceMotion()) return;
    // Explosão dupla para meta alcançada
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: NodeJS.Timeout = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ["#10b981", "#34d399", "#6ee7b7"],
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ["#10b981", "#34d399", "#6ee7b7"],
      });
    }, 250);
  }, []);

  const celebrateSuperMeta = useCallback(() => {
    if (shouldReduceMotion()) return;
    // Explosão dourada para supermeta
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: NodeJS.Timeout = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 80 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ["#fbbf24", "#f59e0b", "#d97706"],
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ["#fbbf24", "#f59e0b", "#d97706"],
      });
    }, 250);
  }, []);

  const celebrateLevelUp = useCallback(() => {
    if (shouldReduceMotion()) return;
    // Explosão central para level up
    confetti({
      particleCount: 150,
      spread: 180,
      origin: { y: 0.5 },
      colors: ["#a855f7", "#c084fc", "#e9d5ff"],
      ticks: 300,
      gravity: 0.8,
    });
  }, []);

  return {
    celebrate,
    celebrateMetaAlcancada,
    celebrateSuperMeta,
    celebrateLevelUp,
  };
}
