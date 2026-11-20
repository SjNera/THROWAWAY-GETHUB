'use client';

// Splash sequence (Figma 01a → 01b → 01c → 01d → 01e → 01 Splash).
// Positions are the 402×874 Figma artboard; keyframes live in app/splash.css.
import * as React from 'react';
import { AiGlow, FloatDoc, FloatIdCard, FloatPin, FloatStore, Logo, WaveBack, WaveFront } from './artwork';

const W = 402;
const H = 874;
export const SPLASH_MS = 3400;

const FLOATS = [
  { size: 56, radius: 18, pad: 14, Icon: FloatIdCard },
  { size: 48, radius: 16, pad: 12, Icon: FloatStore },
  { size: 48, radius: 16, pad: 12, Icon: FloatPin },
  { size: 56, radius: 18, pad: 14, Icon: FloatDoc },
];

const LETTERS = [
  { ch: 'G', x: 0, ai: false },
  { ch: 'a', x: 39, ai: false },
  { ch: 'b', x: 71, ai: false },
  { ch: 'A', x: 106, ai: true },
  { ch: 'I', x: 146, ai: true },
];

export function Splash({ onDone }: { onDone: () => void }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [box, setBox] = React.useState({ w: W, h: H });

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    const t = setTimeout(onDone, SPLASH_MS);
    return () => {
      ro.disconnect();
      clearTimeout(t);
    };
  }, [onDone]);

  const s = box.w / W;
  const stage: React.CSSProperties = {
    position: 'absolute',
    width: W,
    height: H,
    left: (box.w - W) / 2,
    transform: `scale(${s})`,
  };

  return (
    <div
      ref={ref}
      className="absolute inset-0 overflow-hidden"
      style={{ backgroundImage: 'linear-gradient(180deg, #A8500C 0%, #A8500C 52%, #D17A2A 100%)' }}
      aria-label="GabAI"
      role="img"
    >
      {/* centred stage: floats, logo, wordmark */}
      <div style={{ ...stage, top: (box.h - H) / 2 }} className="pointer-events-none">
        {FLOATS.map((f, i) => (
          <div
            key={i}
            className={`sp-float${i + 1} absolute left-0 top-0 overflow-hidden bg-[rgba(255,251,246,0.12)]`}
            style={{ width: f.size, height: f.size, borderRadius: f.radius }}
          >
            <div className="absolute" style={{ left: f.pad, top: f.pad }}>
              <f.Icon />
            </div>
          </div>
        ))}

        <div className="sp-logo absolute" style={{ left: 143, top: 328 }}>
          <Logo size={116} shadow needleClassName="sp-needle" />
        </div>

        <div className="sp-glow absolute" style={{ left: 163, top: 439.5 }}>
          <AiGlow />
        </div>

        <div className="sp-word absolute" style={{ left: 119.5, top: 470, width: 163, height: 61 }}>
          {LETTERS.map((l) => (
            <span
              key={l.ch}
              className={`${l.ai ? 'sp-ai text-brand-200' : 'sp-gab text-brand-50'} absolute top-0 text-[50px] font-extrabold leading-[61px]`}
              style={{ left: l.x }}
            >
              {l.ch}
            </span>
          ))}
        </div>
      </div>

      {/* bottom-anchored stage: loading bar and waves */}
      <div style={{ ...stage, top: box.h - (H * (1 + s)) / 2 }} className="pointer-events-none">
        <div className="absolute overflow-hidden rounded-[3px] bg-[rgba(255,251,246,0.2)]" style={{ left: 131, top: 758, width: 140, height: 6 }}>
          <div className="sp-bar h-1.5" style={{ backgroundImage: 'linear-gradient(90deg, #D17A2A, #FFFBF6)' }} />
        </div>
        <div className="sp-wave-back absolute left-0" style={{ top: 804 }}>
          <WaveBack />
        </div>
        <div className="sp-wave-front absolute left-0" style={{ top: 822 }}>
          <WaveFront />
        </div>
      </div>
    </div>
  );
}
