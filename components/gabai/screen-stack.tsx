'use client';

// Native-style screen transitions:
//  - "push": the new screen slides in from the right over the old one,
//    which slides a little left and dims (like opening Settings on a phone)
//  - "pop":  the reverse (Back)
//  - "fade": a plain dissolve (splash → intro)
import * as React from 'react';
import { cn } from '@/lib/utils';

export type StackMotion = 'push' | 'pop' | 'fade';

type Layer = { id: string; node: React.ReactNode; anim?: string; z: number };

const MS = 380;

export function ScreenStack({ id, motion, children }: { id: string; motion: StackMotion; children: React.ReactNode }) {
  const [layers, setLayers] = React.useState<Layer[]>([{ id, node: children, z: 1 }]);
  const current = React.useRef(id);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  React.useEffect(() => {
    if (id === current.current) {
      setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, node: children } : l)));
      return;
    }
    current.current = id;
    const enter = motion === 'push' ? 'animate-push-in' : motion === 'pop' ? 'animate-pop-in' : 'animate-fade-in';
    const exit = motion === 'push' ? 'animate-push-out' : motion === 'pop' ? 'animate-pop-out' : 'animate-fade-out';
    setLayers((ls) => {
      const old = ls[ls.length - 1];
      return [
        { ...old, anim: exit, z: motion === 'pop' ? 2 : 1 },
        { id, node: children, anim: enter, z: motion === 'pop' ? 1 : 2 },
      ];
    });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => setLayers((ls) => ls.filter((l) => l.id === current.current).map((l) => ({ ...l, anim: undefined }))),
      MS + 40,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, children, motion]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {layers.map((l) => (
        <div
          key={l.id}
          className={cn('absolute inset-0', l.anim, l.id !== current.current && 'pointer-events-none')}
          style={{ zIndex: l.z, boxShadow: l.z === 2 && l.anim ? '0 0 24px rgba(0,0,0,0.18)' : undefined, ['--dur' as string]: `${MS}ms` }}
        >
          {l.node}
        </div>
      ))}
    </div>
  );
}
