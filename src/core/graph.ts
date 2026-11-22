// Types for knowledge/phase0/graph.json and a typed loader.
// The graph is built by the Python tools in knowledge/ — never edit graph.json by hand.
import rawGraph from "../../knowledge/phase0/graph.json";

export type Answers = Record<string, string | undefined>;

/** A condition: every key must match (`when`) / any key matching drops the item (`skip_if`). */
export type Condition = Record<string, string | string[]>;

export interface City {
  name: string;
  fallback_office: string | null;
  aliases?: string[];
}

export interface Office {
  name: string;
  address: string | null;
  phone?: string | null;
  channel: string;
  map: { lat: number | null; lng: number | null; status: string };
  city: string;
  url?: string | null;
  external?: boolean;
  note?: string | null;
  note_tl?: string;
}

export interface Requirement {
  name: string;
  city: string;
  /** Office id where a person gets this item themselves (outside the charters). */
  external?: string | null;
  /** This item is issued by another service in the graph. */
  issuer_service?: string;
  /** Answer key whose value "yes" means the person already has it (skips the issuing service). */
  owned_key?: string;
  hint?: string | null;
  hint_tl?: string;
  applicant?: string | null;
}

export type RequireItem =
  | { req: string; when: Condition; skip_if: Condition }
  | { or_options: string[][]; default: number; label: string; when: Condition; skip_if: Condition };

export interface Variant {
  channel: string;
  office: string;
  fee: string;
  time: string;
  time_by_class: Record<string, string> | null;
  requires: RequireItem[];
  url: string | null;
  detail_steps: string[];
  /** Filipino for each step (null where not translated yet). */
  detail_steps_tl?: (string | null)[];
  evidence: Record<string, unknown>;
  note: string | null;
  note_tl?: string;
}

export interface Service {
  name: string;
  goal: boolean;
  variants: Variant[];
  question_keys: string[];
  city: string;
  exit_if?: Record<string, string>;
  exit_message?: string;
  exit_message_tl?: string;
  exit_office?: string;
  /** Where the whole process is written in the charters (the search index uses these pages only). */
  sections: Section[];
}

export interface Section {
  source: string;
  from_page: number;
  to_page: number;
}

export interface Intent {
  service_by_city: Record<string, string>;
  aliases: string[];
  aliases_tl: string[];
}

export interface Question {
  key: string;
  text: string;
  text_tl: string;
  options: string[];
  option_labels?: Record<string, string>;
  city: string;
}

export interface Evidence {
  ref: string;
  source: string;
  pdf_page: number;
  quote: string;
  status: string;
  note: string | null;
  city: string;
}

export interface Source {
  city: string;
  file: string;
  title?: string;
  url?: string;
  /** An older edition kept only to cross-check: never searched. */
  superseded?: boolean;
  [key: string]: unknown;
}

export interface Graph {
  meta: { version: string; built: string; cities: string[]; scope: string; disclaimer: string; [k: string]: unknown };
  cities: Record<string, City>;
  sources: Record<string, Source>;
  offices: Record<string, Office>;
  requirements: Record<string, Requirement>;
  services: Record<string, Service>;
  intents: Record<string, Intent>;
  questions: Record<string, Question>;
  evidence: Evidence[];
}

export const graph = rawGraph as unknown as Graph;
