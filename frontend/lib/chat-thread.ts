// The chat is one growing, scrollable conversation. Every action appends a
// "batch" of messages (e.g. user → bot → step card); nothing is replaced.
import { STEPS, type StepNo } from './demo-data';

export type Msg = {
  id: number;
  batch: number;
  kind: 'bot' | 'user' | 'services' | 'step';
  text?: string;
  step?: StepNo;
};

export type Thread = { msgs: Msg[]; nextId: number; batch: number };

export function startThread(): Thread {
  return {
    msgs: [
      { id: 1, batch: 0, kind: 'bot', text: 'Hi! I’ll walk you through any Quezon City service, one step at a time.' },
      { id: 2, batch: 0, kind: 'bot', text: 'What do you need today?' },
      { id: 3, batch: 0, kind: 'services' },
    ],
    nextId: 4,
    batch: 0,
  };
}

export function append(t: Thread, msgs: Omit<Msg, 'id' | 'batch'>[]): Thread {
  const batch = t.batch + 1;
  let id = t.nextId;
  return { msgs: [...t.msgs, ...msgs.map((m) => ({ ...m, id: id++, batch }))], nextId: id, batch };
}

// Messages for showing step n, as in the Figma chat frames.
export const stepBatch = (n: StepNo, userSays: string): Omit<Msg, 'id' | 'batch'>[] => [
  { kind: 'user', text: userSays },
  { kind: 'bot', text: STEPS[n].botSays },
  { kind: 'step', step: n },
];

// After the last step: ask again, like the Start screen.
export const againBatch = (): Omit<Msg, 'id' | 'batch'>[] => [
  { kind: 'bot', text: 'What do you need today?' },
  { kind: 'services' },
];
