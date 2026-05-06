import { useCallback } from "react";
import { sounds } from "@/lib/sounds";

export type SoundName = keyof typeof sounds;

export function useSound() {
  const play = useCallback((name: SoundName) => {
    try { sounds[name](); } catch {}
  }, []);
  return { play };
}

export function useSoundHover() {
  const { play } = useSound();
  return {
    onMouseEnter: () => play("hover"),
  };
}
