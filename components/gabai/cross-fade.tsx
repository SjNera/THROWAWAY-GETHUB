'use client';

// Swaps keyed views without overlap: the old view fades out completely,
// then the new one fades in (each half of `duration`, Figma ease-out).
// Used for screens, chat content and the roadmap drawer's views.
import * as React from 'react';
import { cn } from '@/lib/utils';

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
  const [shown, setShown] = React.useState<{ id: string; node: React.ReactNode }>({ id, node: children });
  const [visible, setVisible] = React.useState(true);
  const latest = React.useRef({ id, node: children });
  latest.current = { id, node: children };
  const half = Math.round(duration / 2);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (id === shown.id && pending.current === null) {
      setShown({ id, node: children }); // same view: just refresh its content
      return;
    }
    if (pending.current === id) return; // already swapping to this view
    if (timer.current) clearTimeout(timer.current);
    if (half === 0) {
      pending.current = null;
      setShown({ id, node: children });
      setVisible(true);
      return;
    }
    pending.current = id;
    setVisible(false);
    timer.current = setTimeout(() => {
      pending.current = null;
      setShown(latest.current);
      setVisible(true);
    }, half);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, children]);

  React.useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <div
      className={cn('h-full w-full', className)}
      style={{
        opacity: visible ? 1 : 0,
        transition: `opacity ${half}ms cubic-bezier(0, 0, 0.58, 1)`,
        pointerEvents: visible ? undefined : 'none',
      }}
    >
      {shown.node}
    </div>
  );
}
