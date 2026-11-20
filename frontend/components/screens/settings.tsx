'use client';

// "Settings": a single Dark mode card, in both light and dark mode
// (matches the light Figma frame).
import { Switch } from '@/components/ui/switch';
import { Header } from '@/components/chat/chat-parts';
import { ChevronLeft } from '@/components/brand/icons';

type Props = {
  dark: boolean;
  onDark: (on: boolean) => void;
  onBack: () => void;
};

export function Settings({ dark, onDark, onBack }: Props) {
  return (
    <div className="bg-screen flex h-full flex-col">
      <Header onSettings={onBack} slidersColor="#FFFBF6" />
      <div className="no-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto p-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex size-11 items-center justify-center rounded-[22px] border border-line bg-card"
          >
            <ChevronLeft size={20} strokeWidth={2} color="var(--strong)" />
          </button>
          <h1 className="text-[24px] font-extrabold text-fg">Settings</h1>
        </div>

        <section className="rounded-[20px] border border-line bg-card p-[19px]">
          <label className="flex items-center gap-3">
            <span className="flex flex-1 flex-col gap-[3px]">
              <span className="text-[16px] font-bold text-fg">Dark mode</span>
              <span className="text-[13px] font-medium text-muted">Easier on the eyes at night</span>
            </span>
            <Switch checked={dark} onCheckedChange={onDark} aria-label="Dark mode" />
          </label>
        </section>
      </div>
    </div>
  );
}
