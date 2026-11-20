'use client';

// GabAI mobile front end. Flow: splash → intro 1–3 (first launch) → chat
// (pick a service → roadmap steps, as one continuous conversation) with a
// pull-down roadmap, settings and dark mode. Front end only: no API calls yet.
import * as React from 'react';
import { STEPS } from '@/lib/demo-data';
import { againBatch, append, startThread, stepBatch, type Thread } from '@/lib/chat-thread';
import { prefs, session } from '@/lib/storage';
import { ChatScreen, MOTION, type Phase, type SheetView } from './chat-screen';
import { Intro } from './intro';
import { ScreenStack, type StackMotion } from './screen-stack';
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
  const [motion, setMotion] = React.useState<StackMotion>('fade');
  const [dark, setDark] = React.useState(false);
  const [phase, setPhase] = React.useState<Phase>('start');
  const [thread, setThread] = React.useState<Thread>(startThread);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [view, setView] = React.useState<SheetView>({ kind: 'roadmap' });
  const [checks, setChecks] = React.useState(initialChecks);
  const [restored, setRestored] = React.useState(false);

  // Restore preferences (localStorage) and this tab's conversation (sessionStorage)
  React.useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
    setPhase(session.get<Phase>('phase-v3', 'start'));
    setThread(session.get<Thread>('thread-v3', startThread()));
    setChecks(session.get('checks-v3', initialChecks()));
    setRestored(true);
  }, []);

  React.useEffect(() => {
    if (!restored) return;
    session.set('phase-v3', phase);
    session.set('thread-v3', thread);
    session.set('checks-v3', checks);
  }, [restored, phase, thread, checks]);

  const go = (s: Screen, m: StackMotion) => {
    setMotion(m);
    setScreen(s);
  };

  const onSplashDone = React.useCallback(() => {
    // Intro shows on first launch only; after that the splash goes straight to chat
    go(prefs.get('introSeen') ? 'chat' : 'intro', 'fade');
  }, []);

  const finishIntro = () => {
    prefs.set('introSeen', '1');
    go('chat', 'push');
  };

  const setTheme = (on: boolean) => {
    setDark(on);
    document.documentElement.classList.toggle('dark', on);
    prefs.set('theme', on ? 'dark' : 'light');
  };

  // Close the roadmap drawer first (if open), then add to the chat
  const sheetOpenRef = React.useRef(sheetOpen);
  sheetOpenRef.current = sheetOpen;
  const afterDrawer = (fn: () => void) => {
    if (sheetOpenRef.current) {
      setSheetOpen(false);
      setTimeout(fn, MOTION.roadmap);
    } else fn();
  };

  const pickService = () =>
    afterDrawer(() => {
      setThread((t) => append(t, stepBatch(2, STEPS[2].userSays)));
      setPhase(2);
    });

  const next = () =>
    afterDrawer(() => {
      if (phase === 'start') return;
      setThread((t) => append(t, phase === 4 ? againBatch() : stepBatch((phase + 1) as 3 | 4, 'Next step')));
      if (phase !== 4) setPhase((phase + 1) as Phase);
    });

  let body: React.ReactNode;
  if (screen === 'splash') body = <Splash onDone={onSplashDone} />;
  else if (screen === 'intro') body = <Intro onFinish={finishIntro} />;
  else if (screen === 'settings') body = <Settings dark={dark} onDark={setTheme} onBack={() => go('chat', 'pop')} />;
  else
    body = (
      <ChatScreen
        phase={phase}
        thread={thread}
        sheetOpen={sheetOpen}
        view={view}
        checks={checks}
        onToggle={(step, i) => setChecks((c) => ({ ...c, [step]: c[step].map((v, j) => (j === i ? !v : v)) }))}
        onPickService={pickService}
        onNext={next}
        setSheet={(open, v) => {
          if (v) setView(v);
          setSheetOpen(open);
        }}
        onSettings={() => {
          setSheetOpen(false);
          go('settings', 'push');
        }}
      />
    );

  return (
    <main className="relative mx-auto h-dvh w-full max-w-[430px] overflow-hidden bg-[var(--bg-top)]">
      <ScreenStack id={screen} motion={motion}>
        {body}
      </ScreenStack>
    </main>
  );
}
