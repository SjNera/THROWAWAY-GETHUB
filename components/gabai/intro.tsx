'use client';

// Intro 1–3. Next/Start/Skip use Figma smart animate (0.3s ease-out):
// the page dots resize and the illustration + copy crossfade.
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { INTRO } from '@/lib/demo-data';
import { cn } from '@/lib/utils';
import { CrossFade } from './cross-fade';
import { AccentCheck, AccentPin, ChipCheck, ChipX, IntroArrow, IntroMain, Search18, StepCheck16 } from './artwork';

export function Intro({ onFinish }: { onFinish: () => void }) {
  const [page, setPage] = React.useState(0);
  const item = INTRO[page];
  const next = () => (page < INTRO.length - 1 ? setPage(page + 1) : onFinish());

  return (
    <div className="flex h-full flex-col bg-[#FFF7EE] text-[#1E1E22]">
      <div className="pt-safe-header flex justify-end pr-4">
        <button onClick={onFinish} className="text-[15px] font-bold text-brand-800">
          Skip
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-8">
        <div className="relative h-[430px] w-[334px]">
          <CrossFade id={String(page)} duration={300}>
            <div className="flex flex-col items-center">
              <Illustration page={page} />
              <div className="mt-11 flex w-[334px] flex-col items-center gap-3 text-center">
                <h1 className="text-[30px] font-extrabold tracking-[-0.6px]">{item.title}</h1>
                <p className="text-[16px] font-medium text-[#6B6B68]">{item.body}</p>
              </div>
            </div>
          </CrossFade>
        </div>
      </div>

      <div className="pb-safe-intro flex items-center justify-between px-6 pt-4">
        <div className="flex items-center gap-2" aria-label={`Page ${page + 1} of ${INTRO.length}`}>
          {INTRO.map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-2 rounded-[4px] transition-all duration-300 ease-figma',
                i === page ? 'w-7 bg-brand-700' : 'w-2 bg-[#DACBB3]',
              )}
            />
          ))}
        </div>
        <Button variant="intro" onClick={next}>
          {item.button}
          <IntroArrow />
        </Button>
      </div>
    </div>
  );
}

function Illustration({ page }: { page: number }) {
  const c = INTRO[page];
  return (
    <div className="relative size-[260px]">
      <div className="absolute inset-0 -rotate-6 rounded-[64px]" style={{ background: c.back }} />
      <div
        className="absolute left-7 top-7 size-[204px] rotate-4 rounded-[48px] border-2 border-dashed bg-brand-50"
        style={{ borderColor: c.accent }}
      />
      <div
        className="absolute left-[76px] top-[76px] flex size-[108px] items-center justify-center rounded-[32px] shadow-intro-main"
        style={{ background: c.accent }}
      >
        <IntroMain kind={c.icon} />
      </div>
      <div className="absolute left-[218px] top-6 flex size-12 items-center justify-center rounded-2xl bg-brand-100 shadow-intro-accent">
        <AccentCheck />
      </div>
      <div className="absolute -left-1.5 top-[180px] flex size-12 items-center justify-center rounded-2xl bg-brand-100 shadow-intro-accent">
        <AccentPin />
      </div>
      <div className="absolute inset-x-0 top-[222px] flex justify-center">
        <div
          className={cn(
            'flex items-center gap-2.5 rounded-[18px] border border-[#DACBB3] bg-brand-50 shadow-intro-mini',
            page === 0 ? 'px-3.5 py-2.5' : 'px-[15px] py-[11px]',
          )}
        >
          {page === 0 && (
            <>
              <Search18 />
              <span className="text-[13px] font-semibold text-[#6B6B68]">PWD ID, online…</span>
            </>
          )}
          {page === 1 && (
            <>
              <Chip icon={<ChipCheck />} label="Yes" />
              <Chip icon={<ChipX />} label="No" />
            </>
          )}
          {page === 2 && (
            <>
              <span className="flex size-[30px] items-center justify-center rounded-[10px] bg-brand-100">
                <StepCheck16 />
              </span>
              <span className="h-[3px] w-3.5 rounded-sm bg-[#DACBB3]" />
              <StepNum n={2} />
              <span className="h-[3px] w-3.5 rounded-sm bg-[#DACBB3]" />
              <StepNum n={3} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const Chip = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <span className="flex h-[30px] items-center gap-1.5 rounded-xl bg-brand-100 px-3 text-[13px] font-bold text-brand-700">
    {icon}
    {label}
  </span>
);
const StepNum = ({ n }: { n: number }) => (
  <span className="flex size-[30px] items-center justify-center rounded-[10px] bg-[#F5E6D3] text-[13px] font-extrabold text-brand-800">
    {n}
  </span>
);
