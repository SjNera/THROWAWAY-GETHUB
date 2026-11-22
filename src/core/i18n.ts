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
