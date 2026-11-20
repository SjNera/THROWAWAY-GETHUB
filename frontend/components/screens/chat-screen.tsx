'use client';

// Chat screen: covers the Figma frames "1 Start – pick a service",
// "2 Chat – roadmap bar", "Step 3/4 – chat", "Roadmap open", "Step details
// open", "Map open" and their "Dark ·" twins, as one continuous chat:
// picking a service or "Next step" adds messages to the conversation.
//
// Changes from the Figma prototype (requested in review):
//  - The roadmap is a pull-down drawer: drag the handle (or the bar) down to
//    open, up to close; tapping the bar still toggles it. It slides out of the
//    bar and follows the finger, so nothing overlaps.
//  - Every step (card or roadmap row) opens its own details.
//  - A step is done once all its bring items are ticked; nothing starts ticked.
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { SERVICES, STEPS, isDone, type Step, type StepNo } from '@/lib/demo-data';
import type { Thread } from '@/lib/chat-thread';
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
} from '@/components/chat/chat-parts';
import { CrossFade } from '@/components/motion/cross-fade';
import { Check, Navigation, ServiceIcons } from '@/components/brand/icons';
import { MapCard, OfficeDetails } from '@/components/chat/map-card';

export type Phase = 'start' | 2 | 3 | 4;
export type SheetView = { kind: 'roadmap' } | { kind: 'details'; step: StepNo } | { kind: 'map'; step: StepNo };

export const MOTION = { screen: 300, roadmap: 400, dissolve: 200 };

type Props = {
  phase: Phase;
  thread: Thread;
  sheetOpen: boolean;
  view: SheetView;
  checks: Record<number, boolean[]>;
  onToggle: (step: number, i: number) => void;
  onPickService: () => void;
  onNext: () => void;
  setSheet: (open: boolean, view?: SheetView) => void;
  onSettings: () => void;
};

// ── Drawer drag state ─────────────────────────────────────────────────
// p = how far the drawer is open (0 closed … 1 open). While dragging, p
// follows the finger; on release it snaps open or closed (0.4s ease-out).
function useDrawer(open: boolean, setOpen: (open: boolean) => void) {
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const [h, setH] = React.useState(600);
  const [drag, setDrag] = React.useState<number | null>(null);
  const start = React.useRef<{ y: number; p0: number; t: number; moved: boolean } | null>(null);
  const suppressClick = React.useRef(false);

  React.useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setH(e.contentRect.height + 40));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const p = drag ?? (open ? 1 : 0);

  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      start.current = { y: e.clientY, p0: open ? 1 : 0, t: performance.now(), moved: false };
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const s = start.current;
      if (!s) return;
      const dy = e.clientY - s.y;
      if (!s.moved && Math.abs(dy) < 6) return;
      s.moved = true;
      setDrag(Math.min(1, Math.max(0, s.p0 + dy / h)));
    },
    onPointerUp: (e: React.PointerEvent) => {
      const s = start.current;
      start.current = null;
      if (!s?.moved) return; // a plain tap → handled by onClick
      suppressClick.current = true;
      const dy = e.clientY - s.y;
      const v = dy / Math.max(1, performance.now() - s.t); // px per ms
      const now = Math.min(1, Math.max(0, s.p0 + dy / h));
      setDrag(null);
      setOpen(Math.abs(v) > 0.5 ? v > 0 : now > 0.5);
    },
    onPointerCancel: () => {
      start.current = null;
      setDrag(null);
    },
  };

  // Wrap a tap action so it doesn't also fire after a drag
  const tap = (fn: () => void) => () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    fn();
  };

  return { p, dragging: drag !== null, h, sheetRef, handlers, tap };
}

export function ChatScreen(p: Props) {
  const { phase, checks, thread } = p;
  const inRoadmap = phase !== 'start';
  const step = phase === 'start' ? STEPS[2] : STEPS[phase];
  const drawer = useDrawer(p.sheetOpen, (o) => p.setSheet(o, o ? { kind: 'roadmap' } : undefined));
  const openAmount = inRoadmap ? drawer.p : 0;
  const ease = drawer.dragging ? 'none' : `${MOTION.roadmap}ms cubic-bezier(0, 0, 0.58, 1)`;
  // Switching views inside an open drawer fades out → in (0.2s); while it's
  // closed, the view changes instantly so nothing flickers as it slides in.
  const wasOpen = React.useRef(p.sheetOpen);
  const swapMs = wasOpen.current && p.sheetOpen ? MOTION.dissolve : 0;
  React.useEffect(() => {
    wasOpen.current = p.sheetOpen;
  });

  return (
    <div className="bg-screen chat-root relative flex h-full flex-col">
      <Header onSettings={p.onSettings} />

      {/* Roadmap bar + pull handle (appears once a roadmap starts) */}
      <div
        className="relative z-30 grid shrink-0 transition-[grid-template-rows,opacity] duration-300 ease-figma"
        style={{ gridTemplateRows: inRoadmap ? '1fr' : '0fr', opacity: inRoadmap ? 1 : 0 }}
      >
        <div className="overflow-hidden">
          <div className="px-4 pt-4">
            <button
              type="button"
              aria-expanded={p.sheetOpen}
              aria-label="PWD ID roadmap"
              onClick={drawer.tap(() => (p.sheetOpen ? p.setSheet(false) : p.setSheet(true, { kind: 'roadmap' })))}
              {...drawer.handlers}
              className={cn(
                'relative flex h-[62px] w-full touch-none select-none items-center gap-3 rounded-[18px] bg-card px-3 py-2.5 shadow-soft transition-[border-color] duration-300',
                openAmount > 0.5 ? 'border-2 border-bar-top-line' : 'border border-line',
              )}
            >
              <RoadmapBarBody step={step} open={openAmount > 0.5} />
            </button>
          </div>
          {/* closed-state handle: pull down to open */}
          <div
            {...drawer.handlers}
            onClick={drawer.tap(() => p.setSheet(true, { kind: 'roadmap' }))}
            className="flex h-3.5 touch-none items-center justify-center"
            style={{ opacity: 1 - openAmount }}
            aria-hidden
          >
            <span className="h-1 w-9 rounded-full bg-chk-line" />
          </div>
        </div>
      </div>

      <ChatThread {...p} />

      <InputBar />

      {inRoadmap && (
        <div className="pointer-events-none absolute inset-0 z-20">
          {/* scrim */}
          <div
            className="absolute inset-x-0 bottom-0 top-[calc(var(--hdr)+92px)] bg-scrim"
            style={{
              opacity: openAmount,
              transition: drawer.dragging ? 'none' : `opacity ${MOTION.roadmap}ms cubic-bezier(0, 0, 0.58, 1)`,
              pointerEvents: p.sheetOpen ? 'auto' : 'none',
            }}
            onClick={() => p.setSheet(false)}
          />
          {/* the drawer slides down out of the bar; this box clips it at the bar's bottom edge */}
          <div className="absolute inset-x-0 bottom-0 top-[calc(var(--hdr)+78px)] overflow-hidden">
            <div
              ref={drawer.sheetRef}
              className="rounded-b-[28px] bg-sheet px-4 pt-3.5 shadow-sheet"
              style={{
                transform: `translateY(${(openAmount - 1) * drawer.h}px)`,
                transition: drawer.dragging ? 'none' : `transform ${ease}`,
                pointerEvents: openAmount > 0 ? 'auto' : 'none',
                visibility: openAmount > 0 || p.sheetOpen ? 'visible' : 'hidden',
              }}
            >
              <SheetContent {...p} swapMs={swapMs} />
              {/* open-state handle: push up to close */}
              <div
                {...drawer.handlers}
                onClick={drawer.tap(() => p.setSheet(false))}
                className="flex h-6 touch-none items-center justify-center"
                aria-label="Close roadmap"
                role="button"
              >
                <span className="h-1 w-9 rounded-full bg-chk-line" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// The conversation: one scrollable list that only ever grows. New messages
// rise in one after another (like a messaging app) and the list scrolls so
// the newest exchange is in view.
function ChatThread(p: Props) {
  const { thread, checks } = p;
  const scroller = React.useRef<HTMLDivElement>(null);
  const firstBatch = React.useRef(thread.batch); // batches present on mount don't animate
  const lastStepId = [...thread.msgs].reverse().find((m) => m.kind === 'step')?.id;
  const lastServicesId = [...thread.msgs].reverse().find((m) => m.kind === 'services')?.id;

  React.useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (thread.batch === firstBatch.current) {
      el.scrollTop = el.scrollHeight; // restored conversation: start at the bottom
      return;
    }
    const first = el.querySelector<HTMLElement>(`[data-batch="${thread.batch}"]`);
    if (first) el.scrollTo({ top: Math.max(0, first.offsetTop - 10), behavior: 'smooth' });
  }, [thread.batch]);

  let inBatch = 0;
  let prevBatch = -1;
  return (
    <div ref={scroller} className="no-scrollbar relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="flex min-h-full flex-col gap-3 px-4 pb-4 pt-2.5">
        {thread.msgs.map((m, i) => {
          inBatch = m.batch === prevBatch ? inBatch + 1 : 0;
          prevBatch = m.batch;
          const animate = m.batch > firstBatch.current;
          const wrap = (node: React.ReactNode, className?: string) => (
            <div
              key={m.id}
              data-batch={m.batch}
              className={cn(animate && 'animate-msg-in', className)}
              style={animate ? { animationDelay: `${inBatch * 260}ms` } : undefined}
            >
              {node}
            </div>
          );
          if (m.kind === 'user') return wrap(<UserMessage text={m.text!} />, 'flex justify-end');
          if (m.kind === 'bot') return wrap(<BotMessage text={m.text!} avatar={thread.msgs[i - 1]?.kind !== 'bot'} />);
          if (m.kind === 'services')
            return wrap(<Services onPick={m.id === lastServicesId ? p.onPickService : undefined} />);
          const s = STEPS[m.step!];
          return wrap(
            <Indented>
              <StepCard
                step={s}
                checks={checks[s.n]}
                onToggle={(k) => p.onToggle(s.n, k)}
                onOpen={() => p.setSheet(true, { kind: 'details', step: s.n })}
                onNext={m.id === lastStepId ? p.onNext : undefined}
              />
            </Indented>,
          );
        })}
      </div>
    </div>
  );
}

function Services({ onPick }: { onPick?: () => void }) {
  return (
    <Indented>
      <div className="grid grid-cols-2 gap-2.5">
        {SERVICES.map((s) => {
          const Icon = ServiceIcons[s.icon];
          return (
            <button
              key={s.key}
              type="button"
              onClick={s.key === 'pwd' ? onPick : undefined}
              className="flex flex-col items-start gap-3.5 rounded-[20px] bg-card px-3.5 pb-4 pt-3.5 text-left shadow-soft transition-transform active:scale-[0.98]"
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
  );
}

// Drawer content: roadmap list, a step's details, or the map.
function SheetContent(p: Props & { swapMs: number }) {
  const { view } = p;
  const key = view.kind === 'roadmap' ? 'roadmap' : `${view.kind}-${view.step}`;
  return (
    <CrossFade id={key} duration={p.swapMs} className="h-auto">
      <SheetView {...p} />
    </CrossFade>
  );
}

function SheetView(p: Props) {
  const { view, phase, checks } = p;
  return (
    <div className="flex flex-col items-center gap-3">
      {view.kind === 'roadmap' && (
        <>
          <div className="flex flex-col gap-2 self-stretch">
            <p className={sectionLabel}>ANY ORDER</p>
            {([1, 2, 3] as const).map((k) => (
              <RoadmapRow
                key={k}
                step={STEPS[k]}
                done={isDone(k, checks)}
                current={k === phase}
                onClick={() => p.setSheet(true, { kind: 'details', step: k })}
              />
            ))}
            <p className={sectionLabel}>LAST</p>
            <RoadmapRow
              step={STEPS[4]}
              done={isDone(4, checks)}
              current={phase === 4}
              onClick={() => p.setSheet(true, { kind: 'details', step: 4 })}
            />
          </div>
          <p className="self-stretch text-[13px] font-medium text-muted">Confirm with the office before you go.</p>
        </>
      )}
      {view.kind === 'details' && <Details {...p} step={STEPS[view.step]} />}
      {view.kind === 'map' && (
        <>
          <SheetTitle step={STEPS[view.step]} onBack={() => p.setSheet(true, { kind: 'details', step: view.step })} />
          <MapCard />
          <OfficeDetails />
        </>
      )}
    </div>
  );
}

function Details(p: Props & { step: Step }) {
  const { step, checks } = p;
  const done = isDone(step.n, checks);
  const back = () => p.setSheet(true, { kind: 'roadmap' });
  return (
    <>
      <SheetTitle step={step} onBack={back} />
      {done && (
        <p className="flex items-center gap-2 self-stretch rounded-[14px] bg-done-badge px-3 py-2.5 text-[13px] font-semibold text-done-fg">
          <Check size={16} strokeWidth={2.4} color="var(--done-check)" />
          {step.bring.length ? 'Done. Everything on the list is ticked.' : 'Done. You already have this.'}
        </p>
      )}
      {step.bring.length > 0 && <BringList step={step} checks={checks[step.n]} onToggle={(i) => p.onToggle(step.n, i)} />}
      {step.fee && <FeeTime step={step} />}
      {step.inPerson && (
        <Button variant="orange" onClick={() => p.setSheet(true, { kind: 'map', step: step.n })}>
          <Navigation size={18} strokeWidth={2} color="#FFFBF6" />
          Get directions
        </Button>
      )}
    </>
  );
}
