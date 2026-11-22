// Fixed app text in English and Filipino. Graph text (questions, names) carries its own Filipino fields.
// Filipino strings are drafts pending review by a Filipino speaker (see PLAN.md, step 10).
export type Lang = "en" | "fil";

const OPTION_LABELS: Record<string, { en: string; fil: string }> = {
  yes: { en: "Yes", fil: "Oo" },
  no: { en: "No", fil: "Hindi" },
  online: { en: "Online", fil: "Online" },
  in_person: { en: "In person", fil: "Personal" },
  apparent: { en: "Apparent (visible)", fil: "Halata (nakikita)" },
  non_apparent: { en: "Non-apparent (not visible)", fil: "Hindi halata (hindi nakikita)" },
  cancer_rare: { en: "Cancer or rare disease", fil: "Kanser o rare disease" },
  simple: { en: "Simple", fil: "Simple" },
  complex: { en: "Complex", fil: "Complex" },
  highly_technical: { en: "Highly technical", fil: "Highly technical" },
};

/** Human label for an answer option value. Falls back to "some_value" → "Some value". */
export function optionLabel(value: string, lang: Lang = "en"): string {
  const l = OPTION_LABELS[value];
  if (l) return l[lang];
  const s = value.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const TEXT = {
  channel_online: { en: "Online", fil: "Online" },
  channel_in_person: { en: "In person", fil: "Personal" },
  group_any_order: { en: "Any order", fil: "Kahit anong pagkakasunod" },
  group_then: { en: "Then", fil: "Pagkatapos" },
  group_last: { en: "Last", fil: "Huli" },
  fee_free: { en: "Free", fil: "Libre" },
  roadmap_title: { en: "{name} roadmap", fil: "Roadmap: {name}" },
  confirm_with_office: { en: "Confirm with the office before you go.", fil: "Kumpirmahin muna sa opisina bago pumunta." },
} as const;

export type TextKey = keyof typeof TEXT;

/** Fixed app text. `{name}`-style placeholders are filled from `vars`. */
export function t(key: TextKey, lang: Lang = "en", vars: Record<string, string> = {}): string {
  return TEXT[key][lang].replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`);
}
