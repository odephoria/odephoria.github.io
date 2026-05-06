import { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { useSound } from "@/hooks/use-sound";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof Button> & { soundOnClick?: boolean };

export const SoundButton = forwardRef<HTMLButtonElement, Props>(
  ({ soundOnClick = true, onMouseEnter, onClick, ...props }, ref) => {
    const { play } = useSound();
    return (
      <Button
        ref={ref}
        onMouseEnter={(e) => {
          play("hover");
          onMouseEnter?.(e);
        }}
        onClick={(e) => {
          if (soundOnClick) play("click");
          onClick?.(e);
        }}
        {...props}
      />
    );
  }
);
SoundButton.displayName = "SoundButton";
