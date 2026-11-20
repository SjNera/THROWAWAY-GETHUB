'use client';

// Crossfade between keyed views: Figma's "Dissolve", and what "Smart animate"
// does for layers that don't match by name. The old view stays underneath
// while the new one fades in, then it is removed.
import * as React from 'react';
import { cn } from '@/lib/utils';

type Layer = { id: string; node: React.ReactNode };

export function CrossFade({
  id,
  duration,
  children,
  className,
}: {
  id: string;
  duration: number;
  children: React.ReactNode;
  className?: string;
}) {
  const [layers, setLayers] = React.useState<Layer[]>([{ id, node: children }]);
  const last = React.useRef(id);

  React.useEffect(() => {
    if (id === last.current) {
      setLayers((ls) => [...ls.slice(0, -1), { id, node: children }]);
    } else {
      last.current = id;
      setLayers((ls) => [ls[ls.length - 1], { id, node: children }]);
    }
  }, [id, children]);

  return (
    <div className={cn('relative h-full w-full', className)}>
      {layers.map((l, i) => {
        const top = i === layers.length - 1;
        const fading = top && layers.length > 1;
        return (
          <div
            key={l.id}
            className={cn('absolute inset-0', fading && 'animate-fade-in', !top && 'pointer-events-none')}
            style={fading ? ({ '--dur': `${duration}ms` } as React.CSSProperties) : undefined}
            onAnimationEnd={
              fading ? (e) => e.target === e.currentTarget && setLayers((ls) => ls.slice(-1)) : undefined
            }
          >
            {l.node}
          </div>
        );
      })}
    </div>
  );
}
