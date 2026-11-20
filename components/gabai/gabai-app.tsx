'use client';

// GabAI mobile front end. Flow follows the Figma prototype on the
// "mobile ui" page: splash → intro 1–3 → chat (pick a service → roadmap
// steps) with settings and dark mode. Front end only: no API calls yet.
import * as React from 'react';
import { STEPS } from '@/lib/demo-data';
import { prefs, session } from '@/lib/storage';
import { ChatScreen, MOTION, type Overlay, type Phase } from './chat-screen';
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
  const [lang, setLang] = React.useState<'en' | 'fil'>('en');
  const [phase, setPhase] = React.useState<Phase>('start');
  const [overlay, setOverlayState] = React.useState<Overlay>('none');
  const [contentMs, setContentMs] = React.useState(MOTION.screen);
  const [checks, setChecks] = React.useState(initialChecks);
  const restored = React.useRef(false);

  // Restore preferences (localStorage) and this tab's conversation (sessionStorage)
  React.useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
    setLang(prefs.get('lang') === 'fil' ? 'fil' : 'en');
    setPhase(session.get<Phase>('phase', 'start'));
    setChecks(session.get('checks', initialChecks()));
    restored.current = true;
  }, []);

  React.useEffect(() => {
    if (!restored.current) return;
    session.set('phase', phase);
    session.set('checks', checks);
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

  const toPhase = (ph: Phase, ms: number) => {
    setContentMs(ms);
    setOverlayState('none');
    setPhase(ph);
  };

  let body: React.ReactNode;
  if (screen === 'splash') body = <Splash onDone={onSplashDone} />;
  else if (screen === 'intro') body = <Intro onFinish={finishIntro} />;
  else if (screen === 'settings')
    body = (
      <Settings
        dark={dark}
        lang={lang}
        onLang={(l) => {
          setLang(l);
          prefs.set('lang', l);
        }}
        onDark={setTheme}
        onBack={() => go('chat')}
      />
    );
  else
    body = (
      <ChatScreen
        phase={phase}
        overlay={overlay}
        contentMs={contentMs}
        checks={checks}
        onToggle={(step, i) => setChecks((c) => ({ ...c, [step]: c[step].map((v, j) => (j === i ? !v : v)) }))}
        onPickService={() => toPhase(2, MOTION.screen)}
        onNext={() => phase !== 'start' && toPhase(phase === 4 ? 'start' : ((phase + 1) as Phase), MOTION.screen)}
        onGoStep={(n) => toPhase(n, MOTION.dissolve)}
        setOverlay={(o) => {
          setContentMs(MOTION.roadmap);
          setOverlayState(o);
        }}
        onSettings={() => {
          setOverlayState('none');
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
