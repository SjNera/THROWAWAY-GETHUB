import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// shadcn/ui Button, with GabAI variants added.
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-bold outline-none transition-[opacity,transform] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        // Intro "Next" / "Start"
        intro: 'rounded-[20px] bg-brand-700 px-6 py-4 text-[16px] text-brand-50 shadow-intro-btn',
        // Step card "Next step"
        outline: 'w-full rounded-2xl border border-line bg-card py-[15px] text-[16px] text-fg shadow-soft',
        // "Get directions"
        orange: 'grad-orange w-full rounded-2xl py-[15px] text-[15px] text-brand-50 shadow-send',
        ghost: 'bg-transparent',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

function Button({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button';
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, className }))} {...props} />;
}

export { Button, buttonVariants };
