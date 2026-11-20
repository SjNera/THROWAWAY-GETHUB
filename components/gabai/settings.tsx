'use client';

// "Settings" and "Dark · Settings". In Figma, Language and Privacy only
// exist on the dark frame; mirrored here until the light frame is updated.
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Header, sectionLabel } from './chat-parts';
import { ChevronLeft } from './icons';

type Props = {
  dark: boolean;
  lang: 'en' | 'fil';
  onLang: (l: 'en' | 'fil') => void;
  onDark: (on: boolean) => void;
  onBack: () => void;
};

const card = 'rounded-[20px] border border-line bg-card p-[19px]';

export function Settings({ dark, lang, onLang, onDark, onBack }: Props) {
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

        {dark && (
          <section className={cn(card, 'flex flex-col gap-3')}>
            <p className={sectionLabel}>LANGUAGE</p>
            <div className="flex gap-1.5 rounded-2xl bg-seg p-1.5" role="radiogroup" aria-label="Language">
              {(['en', 'fil'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={lang === l}
                  onClick={() => onLang(l)}
                  className={cn(
                    'h-[42px] flex-1 rounded-xl text-[15px] transition-colors duration-300 ease-figma',
                    lang === l ? 'bg-brand-700 font-bold text-brand-50' : 'font-semibold text-fg',
                  )}
                >
                  {l === 'en' ? 'English' : 'Filipino'}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className={card}>
          <label className="flex items-center gap-3">
            <span className="flex flex-1 flex-col gap-[3px]">
              <span className="text-[16px] font-bold text-fg">Dark mode</span>
              <span className="text-[13px] font-medium text-muted">Easier on the eyes at night</span>
            </span>
            <Switch checked={dark} onCheckedChange={onDark} aria-label="Dark mode" />
          </label>
        </section>

        {dark && (
          <section className={cn(card, 'flex flex-col gap-3')}>
            <p className={sectionLabel}>PRIVACY</p>
            <p className="text-[14px] font-medium leading-[21px] text-fg">
              No login needed. We don’t store anything you type. Always confirm requirements with the office before you go.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
