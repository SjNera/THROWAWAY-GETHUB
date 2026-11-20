// Illustrated map + office details from the Figma "Map open" frame (370×190).
import { OFFICE_ROWS } from '@/lib/demo-data';
import { MapPin } from '@/components/brand/artwork';

const R = ({ l, t, w, h, c, r = 0 }: { l: number; t: number; w: number; h: number; c: string; r?: number }) => (
  <span className="absolute" style={{ left: l, top: t, width: w, height: h, background: `var(${c})`, borderRadius: r }} />
);

export function MapCard() {
  return (
    <div className="relative h-[190px] self-stretch overflow-hidden rounded-[18px] bg-[var(--map-bg)]" aria-label="Map to your barangay hall">
      <R l={262} t={120} w={120} h={90} c="--map-block" r={30} />
      <R l={30} t={12} w={80} h={50} c="--map-park" r={10} />
      <R l={150} t={130} w={70} h={44} c="--map-park" r={10} />
      <R l={290} t={16} w={60} h={34} c="--map-park" r={8} />
      {[48, 96, 144].map((y) => (
        <R key={'h' + y} l={0} t={y} w={370} h={8} c="--map-road" />
      ))}
      {[62, 132, 202, 272].map((x) => (
        <R key={'v' + x} l={x} t={0} w={8} h={190} c="--map-road" />
      ))}
      <svg className="absolute" style={{ left: 60.5, top: 56.5 }} width={185} height={117} viewBox="0 0 185 117">
        <path d="M5.5 111.5V61.5H179.5V5.5H145.5" stroke="var(--map-halo)" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <svg className="absolute" style={{ left: 63, top: 59 }} width={180} height={112} viewBox="0 0 180 112">
        <path d="M3 109V59H177V3H143" stroke="var(--map-route)" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <R l={46} t={148} w={40} h={40} c="--map-here-halo" r={20} />
      <svg className="absolute" style={{ left: 56, top: 158 }} width={20} height={20} viewBox="0 0 20 20">
        <circle cx={10} cy={10} r={8} fill="var(--map-here)" stroke="var(--map-here-ring)" strokeWidth={4} />
      </svg>
      <span className="absolute" style={{ left: 180.75, top: 9.92 }}>
        <MapPin />
      </span>
    </div>
  );
}

export function OfficeDetails() {
  return (
    <dl className="self-stretch font-medium">
      {OFFICE_ROWS.map(([k, v], i) => (
        <div key={k} className={'flex items-center gap-3 py-[9px] ' + (i < OFFICE_ROWS.length - 1 ? 'border-b border-row-line' : '')}>
          <dt className="w-[84px] shrink-0 text-[12px] text-muted">{k}</dt>
          <dd className="text-[14px] text-fg">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
