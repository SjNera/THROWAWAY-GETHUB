'use client';

import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

// shadcn/ui Switch, sized to the Figma "Dark mode switch" (60×34, knob 26, 0.3s ease-out).
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-[34px] w-[60px] shrink-0 items-center rounded-[20px] p-1 outline-none transition-colors duration-300 ease-figma',
        'data-[state=checked]:bg-brand-700 data-[state=unchecked]:bg-[#dacbb3] focus-visible:ring-2 focus-visible:ring-ring/50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-[26px] rounded-full bg-switch-knob transition-transform duration-300 ease-figma data-[state=checked]:translate-x-[26px] data-[state=unchecked]:translate-x-0"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
