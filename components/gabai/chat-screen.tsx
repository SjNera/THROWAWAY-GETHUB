'use client';

// One screen covering the Figma frames "1 Start – pick a service",
// "2 Chat – roadmap bar", "Step 3/4 – chat", "Roadmap open · step 2/3/4",
// "Step details open", "Map open" and their "Dark ·" twins.
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { SERVICES, STEPS, type Step, type StepNo } from '@/lib/demo-data';
import { cn } from '@/lib/utils';
import {
  BotMessage,
  BringList,
  FeeTime,
  Header,
  Indented,
  InputBar,
  RoadmapBarBody,
  RoadmapRow,
  SheetTitle,
  StepCard,
  UserMessage,
  sectionLabel,
  type RowState,
} from './chat-parts';
import { CrossFade } from './cross-fade';
import { Navigation, ServiceIcons } from './icons';
import { MapCard, OfficeDetails } from './map-card';

export type Phase = 'start' | 2 | 3 | 4;
export type Overlay = 'none' | 'roadmap' | 'details' | 'map';

export const MOTION = { screen: 300, roadmap: 400, dissolve: 200 };

type Props = {
  phase: Phase;
  overlay: Overlay;
  contentMs: number;
  checks: Record<number, boolean[]>;
  onToggle: (step: number, i: number) => void;
  onPickService: () => void;
  onNext: () => void;
  onGoStep: (n: 2 | 3 | 4) => void;
  setOverlay: (o: Overlay) => void;
  onSettings: () => void;
};

// Swipe down on the bar opens the roadmap; swipe on the scrim/bar closes it (Figma "On drag").
function useSwipe(onSwipe: () => void) {
  const y = React.useRef<number | null>(null);
  return {
    onPointerDown: (e: React.PointerEvent) => (y.current = e.clientY),
    onPointerUp: (e: React.PointerEvent) => {
      if (y.current !== null && Math.abs(e.clientY - y.current) > 16) onSwipe();
      y.current = null;
    },
  };
}

export function ChatScreen(p: Props) {
  const { phase } = p;
  const inRoadmap = phase !== 'start';
  const step = phase === 'start' ? STEPS[2] : STEPS[phase];
  const openRoadmap = () => p.setOverlay('roadmap');
  const barSwipe = useSwipe(openRoadmap);

  const content = React.useMemo(
    () => (
      <div className="no-scrollbar h-full overflow-y-auto">
        <div className="flex flex-col gap-3 px-4 pb-4 pt-2.5">
          {phase === 'start' ? (
            <StartMessages onPick={p.onPickService} />
          ) : (
            <StepMessages step={STEPS[phase]} {...p} />
          )}
        </div>
      </div>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase, p.checks],
  );

  return (
    <div className="bg-screen chat-root relative flex h-full flex-col">
      <Header onSettings={p.onSettings} />

      {/* Roadmap bar wrap: appears with the roadmap (smart animate) */}
      <div
        className="grid shrink-0 transition-[grid-template-rows,opacity] ease-figma"
        style={{
          gridTemplateRows: inRoadmap ? '1fr' : '0fr',
          opacity: inRoadmap ? 1 : 0,
          transitionDuration: `${p.contentMs}ms`,
        }}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-1.5 pt-4">
            <button
              type="button"
              onClick={openRoadmap}
              {...barSwipe}
              className="flex w-full items-center gap-3 rounded-[18px] border border-line bg-card px-3 py-2.5 shadow-soft"
            >
              <RoadmapBarBody step={step} />
            </button>
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <CrossFade id={String(phase)} duration={p.contentMs}>
          {content}
        </CrossFade>
      </div>

      <InputBar />

      {inRoadmap && <RoadmapOverlay {...p} step={step} />}
    </div>
  );
}

function StartMessages({ onPick }: { onPick: () => void }) {
  return (
    <>
      <BotMessage text="Hi! I’ll walk you through any Quezon City service, one step at a time." />
      <BotMessage text="What do you need today?" avatar={false} />
      <Indented>
        <div className="grid grid-cols-2 gap-2.5">
          {SERVICES.map((s) => {
            const Icon = ServiceIcons[s.icon];
            return (
              <button
                key={s.key}
                type="button"
                onClick={s.key === 'pwd' ? onPick : undefined}
                className="flex flex-col items-start gap-3.5 rounded-[20px] bg-card px-3.5 pb-4 pt-3.5 text-left shadow-soft"
              >
                <span className="grad-orange flex size-11 items-center justify-center rounded-[14px] shadow-soft">
                  <Icon size={24} strokeWidth={2} color="#FFFBF6" />
                </span>
                <span className="text-[15px] font-bold text-fg">{s.label}</span>
              </button>
            );
          })}
        </div>
      </Indented>
    </>
  );
}

function StepMessages({ step, checks, onToggle, onNext, setOverlay }: Props & { step: Step }) {
  return (
    <>
      <UserMessage text={step.userSays} />
      <BotMessage text={step.botSays} />
      <Indented>
        <StepCard
          step={step}
          checks={checks[step.n]}
          onToggle={(i) => onToggle(step.n, i)}
          // Only the step-2 card opens "Step details open" in the prototype
          onOpen={step.n === 2 ? () => setOverlay('details') : undefined}
          onNext={onNext}
        />
      </Indented>
    </>
  );
}

// Scrim + "Roadmap bar top" + overlay sheet. Open/close: 0.4s.
// Roadmap ↔ step details ↔ map inside it: 0.2s dissolve.
function RoadmapOverlay(p: Props & { step: Step }) {
  const { overlay, step } = p;
  const [shown, setShown] = React.useState<Overlay>(overlay);
  const [visible, setVisible] = React.useState(false);
  const prev = React.useRef<Overlay>('none');

  React.useEffect(() => {
    const was = prev.current;
    prev.current = overlay;
    if (overlay !== 'none') {
      setShown(overlay);
      if (was === 'none') requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
    }
  }, [overlay]);

  const close = () => p.setOverlay('none');
  const swipeClose = useSwipe(close);
  if (shown === 'none') return null;

  const outMs = p.contentMs === MOTION.dissolve ? MOTION.dissolve : MOTION.roadmap;
  const n = step.n;
  const rowState = (k: number): RowState => (k < n ? 'done' : k === n ? 'current' : 'todo');
  const onRow = (k: StepNo) => {
    if (k === 2) return p.setOverlay('details'); // only step 2 has a details sheet in Figma
    if (k === 1 || k === n) return close();
    p.onGoStep(k);
  };

  return (
    <div
      className={cn('absolute inset-0 z-20 transition-opacity ease-figma', visible ? 'opacity-100' : 'pointer-events-none opacity-0')}
      style={{ transitionDuration: `${visible ? MOTION.roadmap : outMs}ms` }}
      onTransitionEnd={(e) => e.target === e.currentTarget && !visible && setShown('none')}
    >
      <div className="absolute inset-x-0 bottom-0 top-[calc(var(--hdr)+84px)] bg-scrim" onClick={close} {...swipeClose} />
      <button
        type="button"
        onClick={close}
        {...swipeClose}
        className="absolute inset-x-4 top-[calc(var(--hdr)+16px)] flex h-[62px] items-center gap-3 rounded-[18px] border-2 border-bar-top-line bg-card px-3 py-2.5 shadow-soft"
      >
        <RoadmapBarBody step={step} open />
      </button>
      <div className="absolute inset-x-0 top-[calc(var(--hdr)+77px)] rounded-b-[28px] bg-sheet px-4 pb-3 pt-3.5 shadow-sheet">
        <div key={shown} className="flex animate-fade-in flex-col items-center gap-3 [--dur:200ms]">
          {shown === 'roadmap' && (
            <>
              <div className="flex flex-col gap-2 self-stretch">
                <p className={sectionLabel}>ANY ORDER</p>
                {([1, 2, 3] as const).map((k) => (
                  <RoadmapRow key={k} step={STEPS[k]} state={rowState(k)} onClick={() => onRow(k)} />
                ))}
                <p className={sectionLabel}>LAST</p>
                <RoadmapRow step={STEPS[4]} state={rowState(4)} onClick={() => onRow(4)} />
              </div>
              <p className="self-stretch text-[13px] font-medium text-muted">Confirm with the office before you go.</p>
            </>
          )}
          {shown === 'details' && (
            <>
              <SheetTitle step={STEPS[2]} onBack={() => p.setOverlay('roadmap')} />
              <BringList step={STEPS[2]} checks={p.checks[2]} onToggle={(i) => p.onToggle(2, i)} />
              <FeeTime step={STEPS[2]} />
              <Button variant="orange" onClick={() => p.setOverlay('map')}>
                <Navigation size={18} strokeWidth={2} color="#FFFBF6" />
                Get directions
              </Button>
            </>
          )}
          {shown === 'map' && (
            <>
              <SheetTitle step={STEPS[2]} onBack={() => p.setOverlay('details')} />
              <MapCard />
              <OfficeDetails />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
