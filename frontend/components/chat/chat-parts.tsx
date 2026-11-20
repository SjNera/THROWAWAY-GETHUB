'use client';

// Chat building blocks: header, input bar, bubbles, roadmap bar, step card,
// bring checklist, fee/time tiles, roadmap rows. Colours come from the CSS
// variables in app/globals.css, so light/dark follow the Figma frames.
import * as React from 'react';
import { Button } from '@/components/ui/button';
import type { Step } from '@/lib/demo-data';
import { cn } from '@/lib/utils';
import { HeaderGlow, Logo } from '@/components/brand/artwork';
import {
  ArrowRight,
  ArrowUp,
  Building,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  MapPin,
  Route,
  SlidersHorizontal,
} from '@/components/brand/icons';

export function Header({ onSettings, slidersColor }: { onSettings?: () => void; slidersColor?: string }) {
  return (
    <header className="grad-header pt-safe-header relative z-10 flex shrink-0 items-center gap-3 overflow-hidden px-[18px] pb-[18px] shadow-soft">
      <HeaderGlow />
      <Logo size={44} />
      <p className="relative flex-1 text-[19px] font-extrabold text-brand-50">
        Gab<span className="text-brand-200">AI</span>
      </p>
      <button
        onClick={onSettings}
        aria-label="Settings"
        className="relative flex size-11 items-center justify-center rounded-[14px] border border-settings-btn-line bg-settings-btn"
      >
        <SlidersHorizontal size={22} strokeWidth={2} color={slidersColor ?? 'var(--sliders)'} />
      </button>
    </header>
  );
}

export function InputBar() {
  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="pb-safe-input flex shrink-0 items-center gap-2.5 border-t border-line bg-card px-4 pt-3"
    >
      <input
        aria-label="Message"
        placeholder="Type your question here…"
        className="h-12 min-w-0 flex-1 rounded-full border border-line bg-input px-[18px] text-[15px] font-medium text-fg outline-none placeholder:text-placeholder"
      />
      <button
        type="submit"
        aria-label="Send"
        className="grad-dtile flex size-12 shrink-0 items-center justify-center rounded-3xl shadow-send"
      >
        <ArrowUp size={22} strokeWidth={2} color="#FFFBF6" />
      </button>
    </form>
  );
}

export function BotMessage({ text, avatar = true }: { text: string; avatar?: boolean }) {
  return (
    <div className="flex items-end gap-2">
      {avatar ? (
        <span className="shrink-0 rounded-[7.7px] shadow-soft" aria-label="GabAI">
          <Logo size={30} />
        </span>
      ) : (
        <span className="w-[30px] shrink-0" />
      )}
      <p className="max-w-[290px] rounded-[20px] rounded-bl-[6px] bg-card px-3.5 py-[11px] text-[15px] font-medium leading-[1.4] text-fg shadow-soft">
        {text}
      </p>
    </div>
  );
}

export function UserMessage({ text }: { text: string }) {
  return (
    <p className="grad-user self-end rounded-[20px] rounded-br-[6px] px-4 py-[11px] text-[15px] font-semibold text-brand-50 shadow-tile">
      {text}
    </p>
  );
}

export const Indented = ({ children }: { children: React.ReactNode }) => <div className="pl-[38px]">{children}</div>;

// Roadmap bar. `open` = the "Roadmap bar top" state shown over the open roadmap.
export function RoadmapBarBody({ step, open }: { step: Step; open?: boolean }) {
  return (
    <>
      <span className="grad-dtile flex size-10 shrink-0 items-center justify-center rounded-[13px] shadow-tile">
        <Route size={20} strokeWidth={2} color="#FFFBF6" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
        <span className="truncate text-[14px] font-bold text-fg">PWD ID roadmap</span>
        <span className="truncate text-[13px] font-medium text-muted">
          Step {step.n} of 4 · {step.title}
        </span>
      </span>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-tile">
        {open ? (
          <ChevronUp size={18} strokeWidth={2.4} color="var(--strong)" />
        ) : (
          <ChevronDown size={18} strokeWidth={2.4} color="var(--strong)" />
        )}
      </span>
    </>
  );
}

export function Chip({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-chip py-[3px] pl-2 pr-2.5 text-[12px] font-semibold text-chip-fg">
      <MapPin size={12} strokeWidth={2} color="var(--pin)" />
      {text}
    </span>
  );
}

const label = 'text-[12px] font-bold tracking-[0.96px] text-muted';

// "Bring item" component: State=Off / State=On, 0.15s smart animate.
export function BringItem({ text, on, onToggle }: { text: string; on: boolean; onToggle: () => void }) {
  return (
    <button type="button" role="checkbox" aria-checked={on} onClick={onToggle} className="flex h-7 items-center gap-3 text-left">
      <span className="relative size-6 shrink-0">
        <span
          className={cn(
            'absolute inset-0 rounded-lg border-2 border-chk-line bg-chk transition-opacity duration-150 ease-figma',
            on && 'opacity-0',
          )}
        />
        <span
          className={cn(
            'grad-orange absolute inset-0 flex items-center justify-center rounded-lg transition-opacity duration-150 ease-figma',
            !on && 'opacity-0',
          )}
        >
          <Check size={15} strokeWidth={2} color="#FFFBF6" />
        </span>
      </span>
      <span className="text-[15px] font-medium text-fg">{text}</span>
    </button>
  );
}

export function BringList({ step, checks, onToggle }: { step: Step; checks: boolean[]; onToggle: (i: number) => void }) {
  return (
    <div className="flex flex-col gap-2 self-stretch">
      <p className={label}>BRING</p>
      {step.bring.map((b, i) => (
        <BringItem key={b} text={b} on={!!checks[i]} onToggle={() => onToggle(i)} />
      ))}
    </div>
  );
}

export function FeeTime({ step }: { step: Step }) {
  return (
    <div className="flex gap-2.5 self-stretch font-bold">
      <div className="flex flex-1 flex-col gap-[3px] rounded-[14px] bg-fee px-3 py-2.5 text-fee-fg">
        <span className="text-[12px] tracking-[0.96px]">FEE</span>
        <span className="text-[15px]">{step.fee}</span>
      </div>
      <div className="flex flex-1 flex-col gap-[3px] rounded-[14px] bg-time px-3 py-2.5 text-time-fg">
        <span className="text-[12px] tracking-[0.96px]">TIME</span>
        <span className="text-[15px]">{step.time}</span>
      </div>
    </div>
  );
}

function StepTitle({ step }: { step: Step }) {
  return (
    <span className="flex flex-col items-start gap-1.5">
      <span className="text-[17px] font-extrabold text-fg">{step.title}</span>
      {step.chip && <Chip text={step.chip} />}
    </span>
  );
}

export function StepCard({
  step,
  checks,
  onToggle,
  onOpen,
  onNext,
}: {
  step: Step;
  checks: boolean[];
  onToggle: (i: number) => void;
  onOpen: () => void;
  onNext?: () => void; // only the latest card in the chat has "Next step"
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[22px] bg-card p-4 shadow-widget">
      <button type="button" onClick={onOpen} className="flex items-center gap-3 text-left" aria-label={`Open ${step.title} details`}>
        <span className="flex size-[46px] shrink-0 items-center justify-center rounded-[15px] bg-tile">
          <Building size={24} strokeWidth={2} color="var(--building)" />
        </span>
        <span className="min-w-0 flex-1">
          <StepTitle step={step} />
        </span>
        <ChevronRight size={20} strokeWidth={2} color="var(--chev)" />
      </button>
      <BringList step={step} checks={checks} onToggle={onToggle} />
      <FeeTime step={step} />
      {onNext && (
        <Button variant="outline" onClick={onNext}>
          Next step
          <ArrowRight size={18} strokeWidth={2} color="var(--strong)" />
        </Button>
      )}
    </div>
  );
}

// One row in the roadmap list. A step is "done" once every bring item is ticked.
export function RoadmapRow({
  step,
  done,
  current,
  onClick,
}: {
  step: Step;
  done: boolean;
  current: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors duration-200 ease-figma',
        current ? 'border-2 border-step-on-line bg-step-on' : 'border border-line bg-card',
      )}
    >
      {done ? (
        <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[11px] bg-done-badge">
          <Check size={18} strokeWidth={2} color="var(--done-check)" />
        </span>
      ) : (
        <span
          className={cn(
            'flex size-[34px] shrink-0 items-center justify-center rounded-[11px] text-[14px] font-bold',
            current ? 'grad-step-badge text-brand-50' : 'bg-badge text-badge-fg',
          )}
        >
          {step.n}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn('text-[14px] font-semibold', done && !current ? 'text-done-title' : 'text-fg')}>{step.title}</span>
        <span className={cn('text-[13px] font-medium', done ? 'text-done-fg' : 'text-muted')}>{done ? 'Done' : step.meta}</span>
      </span>
      <ChevronRight size={18} strokeWidth={2} color="var(--chev)" />
    </button>
  );
}

export function SheetTitle({ step, onBack }: { step: Step; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 self-stretch">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="flex size-11 shrink-0 items-center justify-center rounded-[20px] border border-line bg-card shadow-soft"
      >
        <ChevronLeft size={20} strokeWidth={2} color="var(--strong)" />
      </button>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-tile">
        <Building size={24} strokeWidth={2} color="var(--building)" />
      </span>
      <StepTitle step={step} />
    </div>
  );
}

export const sectionLabel = label;
