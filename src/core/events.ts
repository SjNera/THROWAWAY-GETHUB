// The contract between the brain and any screen (terminal, web).
// State and Input are validated with Zod (they arrive over the API); events are produced by us.
import { z } from "zod";
import type { QuestionView } from "./questions";
import type { Citation, RoadmapView, StepCard } from "./view";

export const LangSchema = z.enum(["en", "fil"]);

/** Everything the conversation needs to continue. The client keeps it and sends it back each turn. */
export const StateSchema = z.object({
  v: z.literal(1),
  lang: LangSchema,
  intent: z.string().max(100).nullable(),
  answers: z.record(z.string().max(100), z.string().max(100)),
  /** Question key we're waiting on, if any. */
  pending: z.string().max(100).nullable(),
  /** Step number currently shown (after the roadmap is ready). */
  current: z.number().int().positive().nullable(),
  /** Step numbers the person marked done. */
  done: z.array(z.number().int().positive()).max(100),
});
export type State = z.infer<typeof StateSchema>;

export const InputSchema = z.discriminatedUnion("type", [
  /** Begin (or show the start again). */
  z.object({ type: z.literal("start") }),
  /** Tapped a service tile. */
  z.object({ type: z.literal("choose_intent"), intent: z.string().max(100) }),
  /** Tapped an option, or typed the city. */
  z.object({ type: z.literal("answer"), key: z.string().max(100), value: z.string().max(200) }),
  /** Anything typed in the text box. */
  z.object({ type: z.literal("text"), text: z.string().max(1000) }),
  z.object({ type: z.literal("next_step") }),
  z.object({ type: z.literal("open_step"), number: z.number().int().positive() }),
  z.object({ type: z.literal("show_roadmap") }),
  z.object({ type: z.literal("mark_done"), number: z.number().int().positive(), done: z.boolean() }),
  z.object({ type: z.literal("set_lang"), lang: LangSchema }),
  z.object({ type: z.literal("restart") }),
]);
export type Input = z.infer<typeof InputSchema>;

export interface Choice {
  intent: string;
  label: string;
}

export type NotCoveredReason = "city_coming_soon" | "not_in_city" | "outside_process" | "unknown_service";

/** Something the person can do now. Screens show it as a button (web) or a shortcut (terminal). */
export interface Action {
  id: "restart" | "show_roadmap";
  label: string;
  /** The input to send when the person picks this action. */
  input: Input;
}

export type Event =
  | { type: "message"; text: string }
  | { type: "choices"; items: Choice[] }
  | { type: "question"; question: QuestionView }
  | { type: "roadmap"; roadmap: RoadmapView; current: number | null; done: number[] }
  | { type: "step"; step: StepCard; total: number; isLast: boolean; done: boolean }
  | { type: "not_covered"; reason: NotCoveredReason; message: string; office: string | null }
  | { type: "answer"; text: string; citations: Citation[] }
  /** What the person can do next, e.g. "Start over" once a journey has ended. */
  | { type: "actions"; items: Action[] };

export interface TurnResult {
  state: State;
  events: Event[];
}

export function initialState(lang: z.infer<typeof LangSchema> = "en"): State {
  return { v: 1, lang, intent: null, answers: {}, pending: null, current: null, done: [] };
}
