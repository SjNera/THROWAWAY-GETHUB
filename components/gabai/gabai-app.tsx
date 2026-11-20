'use client';

// GabAI mobile front end. Flow follows the Figma prototype on the
// "mobile ui" page: splash → intro 1–3 → chat (pick a service → roadmap
// steps) with settings and dark mode. Front end only: no API calls yet.
import * as React from 'react';
import { STEPS } from '@/lib/demo-data';
import { prefs, session } from '@/lib/storage';
import { ChatScreen, MOTION, type Phase, type SheetView } from './chat-screen';
import { CrossFade } from './cross-fade';
import { Intro } from './intro';
import { Settings } from './settings';
import { Splash } from './splash';

type Screen = 'splash' | 'intro' | 'chat' | 'settings';

const initialChecks = (): Record<number, boolean[]> => ({
  2: [...STEPS[2].bringDefault],
  3: [...STEPS[3].bringDefault],
  4: [...STEPS[4].bringDefault],
});

export function GabaiApp() {
  const [screen, setScreen] = React.useState<Screen>('splash');
  const [screenMs, setScreenMs] = React.useState(MOTION.screen);
  const [dark, setDark] = React.useState(false);
  const [phase, setPhase] = React.useState<Phase>('start');
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [view, setView] = React.useState<SheetView>({ kind: 'roadmap' });
  const [contentMs, setContentMs] = React.useState(MOTION.screen);
  const [checks, setChecks] = React.useState(initialChecks);
  const restored = React.useRef(false);

  // Restore preferences (localStorage) and this tab's conversation (sessionStorage)
  React.useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
    setPhase(session.get<Phase>('phase', 'start'));
    setChecks(session.get('checks-v2', initialChecks()));
    restored.current = true;
  }, []);

  React.useEffect(() => {
    if (!restored.current) return;
    session.set('phase', phase);
    session.set('checks-v2', checks);
  }, [phase, checks]);

  const go = (s: Screen, ms: number = MOTION.screen) => {
    setScreenMs(ms);
    setScreen(s);
  };

  const onSplashDone = React.useCallback(() => {
    // Intro shows on first launch only; after that the splash goes straight to chat
    go(prefs.get('introSeen') ? 'chat' : 'intro', 300);
  }, []);

  const finishIntro = () => {
    prefs.set('introSeen', '1');
    go('chat');
  };

  const setTheme = (on: boolean) => {
    setDark(on);
    document.documentElement.classList.toggle('dark', on);
    prefs.set('theme', on ? 'dark' : 'light');
  };

  // Change the chat step. If the roadmap drawer is open, it slides closed
  // first (0.4s) and only then the chat swaps, so the two never overlap.
  const sheetOpenRef = React.useRef(sheetOpen);
  sheetOpenRef.current = sheetOpen;
  const toPhase = (ph: Phase, ms: number) => {
    const swap = () => {
      setContentMs(ms);
      setPhase(ph);
    };
    if (sheetOpenRef.current) {
      setSheetOpen(false);
      setTimeout(swap, MOTION.roadmap);
    } else swap();
  };

  let body: React.ReactNode;
  if (screen === 'splash') body = <Splash onDone={onSplashDone} />;
  else if (screen === 'intro') body = <Intro onFinish={finishIntro} />;
  else if (screen === 'settings')
    body = (
      <Settings
        dark={dark}
        onDark={setTheme}
        onBack={() => go('chat')}
      />
    );
  else
    body = (
      <ChatScreen
        phase={phase}
        sheetOpen={sheetOpen}
        view={view}
        contentMs={contentMs}
        checks={checks}
        onToggle={(step, i) => setChecks((c) => ({ ...c, [step]: c[step].map((v, j) => (j === i ? !v : v)) }))}
        onPickService={() => toPhase(2, MOTION.screen)}
        onNext={() => phase !== 'start' && toPhase(phase === 4 ? 'start' : ((phase + 1) as Phase), MOTION.screen)}
        setSheet={(open, v) => {
          if (v) setView(v);
          setSheetOpen(open);
        }}
        onSettings={() => {
          setSheetOpen(false);
          go('settings');
        }}
      />
    );

  return (
    <main className="relative mx-auto h-dvh w-full max-w-[430px] overflow-hidden bg-[var(--bg-top)]">
      <CrossFade id={screen} duration={screenMs}>
        {body}
      </CrossFade>
    </main>
  );
}
