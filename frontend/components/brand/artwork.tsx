// Brand artwork exported from the Figma file (exact vectors): logo, splash
// floats, waves, glows, intro illustrations and the map pin. Standard UI icons
// come from lucide-react instead (see icons.tsx).
import * as React from 'react';

const round = { strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };

// ── Logo (116×116 master; every size scales from it) ─────────────────
const RING =
  'M92.8 61.3143C92.0684 69.3639 88.5575 76.9079 82.87 82.6511C77.1826 88.3944 69.6733 91.9788 61.6312 92.789C53.589 93.5992 45.5157 91.5847 38.7969 87.0913C32.0782 82.598 27.1331 75.9059 24.8105 68.164C22.4879 60.422 22.9327 52.113 26.0685 44.6633C29.2043 37.2135 34.8356 31.0877 41.9956 27.3372C49.1557 23.5868 57.398 22.4457 65.3076 24.1098C73.2173 25.774 80.301 30.1395 85.3428 36.4571';

export function Logo({
  size,
  shadow,
  needleClassName,
}: {
  size: number;
  shadow?: boolean;
  needleClassName?: string;
}) {
  const k = size / 116;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 bg-brand-50"
        style={{ borderRadius: 29.829 * k, boxShadow: shadow ? 'var(--shadow-logo)' : undefined }}
      />
      <svg className="absolute inset-0" width={size} height={size} viewBox="0 0 116 116">
        <path d={RING} stroke="#C2610F" strokeWidth={13.2571} strokeLinecap="round" fill="none" />
      </svg>
      <div className={'absolute top-0 ' + (needleClassName ?? '')} style={{ left: 5 * k, width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 116 116">
          <path d="M94.4571 58L59.6571 49.7143V66.2857L94.4571 58Z" fill="#C2610F" />
          <path d="M35 58L60 50V66L35 58Z" fill="#F0B77A" />
          <circle cx={59.6571} cy={58} r={4.1429} fill="#FFFBF6" />
        </svg>
      </div>
    </div>
  );
}

// ── Splash ───────────────────────────────────────────────────────────
const floatStroke = { stroke: '#FFC98F', strokeWidth: 1.9, ...round };
export const FloatIdCard = () => (
  <svg width={28} height={28} viewBox="0 0 28 28">
    <path
      d="M7.58335 19.8333C8.16669 18.0833 9.33335 17.5 10.5 17.5C11.6667 17.5 12.8334 18.0833 13.4167 19.8333M16.3334 12.8333H19.8334M16.3334 16.3333H19.8334M4.66669 7H23.3334V22.1667H4.66669V7ZM10.5 3.5H17.5V7H10.5V3.5ZM10.5 16.3333C11.1189 16.3333 11.7124 16.0875 12.1499 15.6499C12.5875 15.2123 12.8334 14.6188 12.8334 14C12.8334 13.3812 12.5875 12.7877 12.1499 12.3501C11.7124 11.9125 11.1189 11.6667 10.5 11.6667C9.88118 11.6667 9.28769 11.9125 8.8501 12.3501C8.41252 12.7877 8.16669 13.3812 8.16669 14C8.16669 14.6188 8.41252 15.2123 8.8501 15.6499C9.28769 16.0875 9.88118 16.3333 10.5 16.3333Z"
      {...floatStroke}
    />
  </svg>
);
export const FloatStore = () => (
  <svg width={24} height={24} viewBox="0 0 24 24">
    <path
      transform="translate(4 4)"
      d="M0 5L1.5 0L14.5 0L16 5M0 5L0 16L16 16L16 5M0 5C0.12 5.569 0.45 6.082 0.933 6.451C1.417 6.819 2.024 7.021 2.65 7.021C3.276 7.021 3.883 6.819 4.367 6.451C4.85 6.082 5.18 5.569 5.3 5C5.3 5.663 5.584 6.299 6.091 6.768C6.597 7.237 7.284 7.5 8 7.5C8.716 7.5 9.403 7.237 9.909 6.768C10.416 6.299 10.7 5.663 10.7 5C10.82 5.569 11.15 6.082 11.633 6.451C12.117 6.819 12.724 7.021 13.35 7.021C13.976 7.021 14.583 6.819 15.067 6.451C15.55 6.082 15.88 5.569 16 5M6 16L6 11L10 11L10 16"
      {...floatStroke}
    />
  </svg>
);
export const FloatPin = () => (
  <svg width={24} height={24} viewBox="0 0 24 24">
    <path
      transform="translate(5 3)"
      d="M7 18C7 18 0 11.8 0 7C0 5.143 0.737 3.363 2.05 2.05C3.363 0.737 5.143 0 7 0C8.857 0 10.637 0.737 11.95 2.05C13.263 3.363 14 5.143 14 7C14 11.8 7 18 7 18ZM7 4.5C6.337 4.5 5.701 4.763 5.232 5.232C4.763 5.701 4.5 6.337 4.5 7C4.5 7.663 4.763 8.299 5.232 8.768C5.701 9.237 6.337 9.5 7 9.5C7.663 9.5 8.299 9.237 8.768 8.768C9.237 8.299 9.5 7.663 9.5 7C9.5 6.337 9.237 5.701 8.768 5.232C8.299 4.763 7.663 4.5 7 4.5Z"
      {...floatStroke}
    />
  </svg>
);
export const FloatDoc = () => (
  <svg width={28} height={28} viewBox="0 0 28 28">
    <path
      transform="translate(8.1667 3.5)"
      d="M8.1667 0L0 0L0 21L14 21L14 5.8333M8.1667 0L14 5.8333M8.1667 0L8.1667 5.8333L14 5.8333M3.5 11.6667L10.5 11.6667M3.5 16.3333L10.5 16.3333"
      {...floatStroke}
    />
  </svg>
);

export const WaveBack = () => (
  <svg width={520} height={70} viewBox="0 0 520 70">
    <path d="M0 34C60 8 120 60 180 34C240 8 300 8 360 34C420 60 480 60 520 34V70H0V34Z" fill="#E3A55C" fillOpacity={0.28} />
  </svg>
);
export const WaveFront = () => (
  <svg width={520} height={52} viewBox="0 0 520 52">
    <path d="M0 26C60 4 120 48 180 26C240 4 300 4 360 26C420 48 480 48 520 26V52H0V26Z" fill="#FFFBF6" fillOpacity={0.16} />
  </svg>
);

// Splash "AI glow": 130×70 ellipse, layer blur 26 (σ 13), #E3A55C.
export const AiGlow = () => (
  <svg width={182} height={122} viewBox="0 0 182 122">
    <defs>
      <filter id="gabai-ai-glow" x="0" y="0" width="182" height="122" filterUnits="userSpaceOnUse">
        <feGaussianBlur stdDeviation={13} />
      </filter>
    </defs>
    <ellipse cx={91} cy={61} rx={65} ry={35} fill="#E3A55C" filter="url(#gabai-ai-glow)" />
  </svg>
);

// Header "Glow": 140×140 circle at (-60, 20), 40% #E3A55C, blur 50 (σ 25).
export const HeaderGlow = () => (
  <svg width={240} height={240} viewBox="0 0 240 240" className="pointer-events-none absolute -left-[110px] -top-[30px]">
    <defs>
      <filter id="gabai-hdr-glow" x="0" y="0" width="240" height="240" filterUnits="userSpaceOnUse">
        <feGaussianBlur stdDeviation={25} />
      </filter>
    </defs>
    <circle cx={120} cy={120} r={70} fill="#E3A55C" fillOpacity={0.4} filter="url(#gabai-hdr-glow)" />
  </svg>
);

// ── Intro illustrations ──────────────────────────────────────────────
const INTRO_ICON = {
  search:
    'M47.25 47.25L37.575 37.575M24.75 9C22.6817 9 20.6336 9.40739 18.7227 10.1989C16.8119 10.9904 15.0756 12.1505 13.6131 13.6131C12.1505 15.0756 10.9904 16.8119 10.1989 18.7227C9.40739 20.6336 9 22.6817 9 24.75C9 26.8183 9.40739 28.8664 10.1989 30.7773C10.9904 32.6881 12.1505 34.4244 13.6131 35.8869C15.0756 37.3495 16.8119 38.5096 18.7227 39.3011C20.6336 40.0926 22.6817 40.5 24.75 40.5C26.8183 40.5 28.8664 40.0926 30.7773 39.3011C32.6881 38.5096 34.4244 37.3495 35.8869 35.8869C37.3495 34.4244 38.5096 32.6881 39.3011 30.7773C40.0926 28.8664 40.5 26.8183 40.5 24.75C40.5 22.6817 40.0926 20.6336 39.3011 18.7227C38.5096 16.8119 37.3495 15.0756 35.8869 13.6131C34.4244 12.1505 32.6881 10.9904 30.7773 10.1989C28.8664 9.40739 26.8183 9 24.75 9Z',
  chat: 'M9 11.25H45V36H22.5L13.5 45V36H9V11.25Z',
  route:
    'M18 38.25C18 39.4435 17.5259 40.5881 16.682 41.432C15.8381 42.2759 14.6935 42.75 13.5 42.75C12.3065 42.75 11.1619 42.2759 10.318 41.432C9.47411 40.5881 9 39.4435 9 38.25C9 37.0565 9.47411 35.9119 10.318 35.068C11.1619 34.2241 12.3065 33.75 13.5 33.75C14.6935 33.75 15.8381 34.2241 16.682 35.068C17.5259 35.9119 18 37.0565 18 38.25ZM18 38.25H31.5C33.2902 38.25 35.0071 37.5388 36.273 36.273C37.5388 35.0071 38.25 33.2902 38.25 31.5C38.25 29.7098 37.5388 27.9929 36.273 26.727C35.0071 25.4612 33.2902 24.75 31.5 24.75H22.5C20.7098 24.75 18.9929 24.0388 17.727 22.773C16.4612 21.5071 15.75 19.7902 15.75 18C15.75 16.2098 16.4612 14.4929 17.727 13.227C18.9929 11.9612 20.7098 11.25 22.5 11.25H36M40.5 20.25C41.6935 20.25 42.8381 19.7759 43.682 18.932C44.5259 18.0881 45 16.9435 45 15.75C45 14.5565 44.5259 13.4119 43.682 12.568C42.8381 11.7241 41.6935 11.25 40.5 11.25C39.3065 11.25 38.1619 11.7241 37.318 12.568C36.4741 13.4119 36 14.5565 36 15.75C36 16.9435 36.4741 18.0881 37.318 18.932C38.1619 19.7759 39.3065 20.25 40.5 20.25Z',
};
export const IntroMain = ({ kind }: { kind: keyof typeof INTRO_ICON }) => (
  <svg width={54} height={54} viewBox="0 0 54 54">
    <path d={INTRO_ICON[kind]} stroke="#FFFBF6" strokeWidth={1.8} {...round} />
  </svg>
);
export const AccentCheck = () => (
  <svg width={24} height={24} viewBox="0 0 24 24">
    <path d="M5 12.5L9.5 17L19 7" stroke="#A8500C" strokeWidth={2.2} {...round} />
  </svg>
);
export const AccentPin = () => (
  <svg width={24} height={24} viewBox="0 0 24 24">
    <path
      d="M12 21C12 21 5 14.8 5 10C5 8.14348 5.7375 6.36301 7.05025 5.05025C8.36301 3.7375 10.1435 3 12 3C13.8565 3 15.637 3.7375 16.9497 5.05025C18.2625 6.36301 19 8.14348 19 10C19 14.8 12 21 12 21ZM12 7.5C11.337 7.5 10.7011 7.76339 10.2322 8.23223C9.76339 8.70107 9.5 9.33696 9.5 10C9.5 10.663 9.76339 11.2989 10.2322 11.7678C10.7011 12.2366 11.337 12.5 12 12.5C12.663 12.5 13.2989 12.2366 13.7678 11.7678C14.2366 11.2989 14.5 10.663 14.5 10C14.5 9.33696 14.2366 8.70107 13.7678 8.23223C13.2989 7.76339 12.663 7.5 12 7.5Z"
      stroke="#D17A2A"
      strokeWidth={2}
      {...round}
    />
  </svg>
);
export const Search18 = () => (
  <svg width={18} height={18} viewBox="0 0 18 18">
    <path
      d="M15.75 15.75L12.525 12.525M8.25 3C7.56056 3 6.87787 3.1358 6.24091 3.39963C5.60395 3.66347 5.0252 4.05018 4.53769 4.53769C4.05018 5.0252 3.66347 5.60395 3.39963 6.24091C3.1358 6.87787 3 7.56056 3 8.25C3 8.93944 3.1358 9.62213 3.39963 10.2591C3.66347 10.896 4.05018 11.4748 4.53769 11.9623C5.0252 12.4498 5.60395 12.8365 6.24091 13.1004C6.87787 13.3642 7.56056 13.5 8.25 13.5C8.93944 13.5 9.62213 13.3642 10.2591 13.1004C10.896 12.8365 11.4748 12.4498 11.9623 11.9623C12.4498 11.4748 12.8365 10.896 13.1004 10.2591C13.3642 9.62213 13.5 8.93944 13.5 8.25C13.5 7.56056 13.3642 6.87787 13.1004 6.24091C12.8365 5.60395 12.4498 5.0252 11.9623 4.53769C11.4748 4.05018 10.896 3.66347 10.2591 3.39963C9.62213 3.1358 8.93944 3 8.25 3Z"
      stroke="#6B6B68"
      strokeWidth={2}
      {...round}
    />
  </svg>
);
export const ChipCheck = () => (
  <svg width={15} height={15} viewBox="0 0 15 15">
    <path d="M3.125 7.8125L5.9375 10.625L11.875 4.375" stroke="#D17A2A" strokeWidth={2.4} {...round} />
  </svg>
);
export const ChipX = () => (
  <svg width={15} height={15} viewBox="0 0 15 15">
    <path d="M3.75 3.75L11.25 11.25M11.25 3.75L3.75 11.25" stroke="#A8500C" strokeWidth={2.4} {...round} />
  </svg>
);
export const StepCheck16 = () => (
  <svg width={16} height={16} viewBox="0 0 16 16">
    <path d="M3.33337 8.33332L6.33337 11.3333L12.6667 4.66666" stroke="#D17A2A" strokeWidth={2.6} {...round} />
  </svg>
);
export const IntroArrow = () => (
  <svg width={20} height={20} viewBox="0 0 20 20">
    <path d="M4.16669 10H15.8334M10.8334 15L15.8334 10L10.8334 5" stroke="#FFFBF6" strokeWidth={2} {...round} />
  </svg>
);

// ── Map pin (46×46 node with its orange drop shadow; svg box 51×59) ──
export const MapPin = () => (
  <svg width={51} height={59} viewBox="0 0 51 59">
    <defs>
      <filter id="gabai-pin-shadow" x="-5.75" y="-1.91675" width="62" height="62" filterUnits="userSpaceOnUse">
        <feOffset dy={4} in="SourceAlpha" />
        <feGaussianBlur stdDeviation={4} />
        <feColorMatrix type="matrix" values="0 0 0 0 0.709804 0 0 0 0 0.341176 0 0 0 0 0.0509804 0 0 0 0.45 0" />
        <feBlend mode="normal" in="SourceGraphic" />
      </filter>
    </defs>
    <g filter="url(#gabai-pin-shadow)" stroke="#C2610F" strokeWidth={3.83333} {...round}>
      <path d="M40.5834 21.25C40.5834 32.75 25.2501 44.25 25.2501 44.25C25.2501 44.25 9.91675 32.75 9.91675 21.25C9.91675 17.1833 11.5322 13.2832 14.4078 10.4077C17.2833 7.5321 21.1834 5.91663 25.2501 5.91663C29.3167 5.91663 33.2168 7.5321 36.0924 10.4077C38.9679 13.2832 40.5834 17.1833 40.5834 21.25Z" />
      <circle cx={25.25} cy={21.25} r={5.75} />
    </g>
  </svg>
);
