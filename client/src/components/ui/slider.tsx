import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  size?: "default" | "mobile";
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, size = "default", ...props }, ref) => {
  const isMobile = size === "mobile";
  
  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        isMobile ? "h-12" : "h-4",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track className={cn(
        "relative w-full grow overflow-hidden rounded-full bg-zinc-700",
        isMobile ? "h-2" : "h-1"
      )}>
        <SliderPrimitive.Range className="absolute h-full bg-zinc-400" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className={cn(
        "block rounded-full bg-zinc-300 shadow-lg ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50 hover:bg-white",
        isMobile ? "h-7 w-7 -mt-0.5" : "h-3 w-3"
      )} />
    </SliderPrimitive.Root>
  );
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
