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
  greeting: { en: "Hi! I'll walk you through a city service, one step at a time.", fil: "Hi! Gagabayan kita sa serbisyo ng lungsod, isa-isang hakbang." },
  ask_service: { en: "What do you need today?", fil: "Ano ang kailangan mo ngayon?" },
  got_service: { en: "Got it — {name}.", fil: "Sige — {name}." },
  got_city: { en: "Got it — {city}.", fil: "Sige — {city}." },
  city_soon: { en: "{city} will be covered soon.", fil: "Malapit nang maisama ang {city}." },
  city_try_another: { en: "You can type another city, or start over.", fil: "Puwede kang mag-type ng ibang lungsod, o magsimula ulit." },
  city_unknown: { en: "I didn't catch the city.", fil: "Hindi ko nakuha ang lungsod." },
  pick_option: { en: "Please pick one of the options.", fil: "Pumili ng isa sa mga opsyon." },
  service_unknown: { en: "Sorry, I couldn't tell which service you need. Pick one below, or try other words.", fil: "Pasensya, hindi ko matukoy kung anong serbisyo ang kailangan mo. Pumili sa ibaba, o subukan ang ibang salita." },
  roadmap_ready: { en: "Here's your roadmap. Let's start with step 1.", fil: "Ito ang iyong roadmap. Simulan natin sa hakbang 1." },
  next_step: { en: "Here's your next step.", fil: "Ito ang susunod mong hakbang." },
  last_step: { en: "Last step!", fil: "Huling hakbang!" },
  all_done: { en: "That's every step. Confirm with the office before you go.", fil: "Iyan na ang lahat ng hakbang. Kumpirmahin muna sa opisina bago pumunta." },
  no_such_step: { en: "There's no step {n}.", fil: "Walang hakbang {n}." },
  no_roadmap_yet: { en: "There's no roadmap yet. Pick a service first.", fil: "Wala pang roadmap. Pumili muna ng serbisyo." },
  ask_unavailable: { en: "I can't answer free-form questions yet. Use the steps, or start over.", fil: "Hindi pa ako makasagot ng ibang tanong. Gamitin ang mga hakbang, o magsimula ulit." },
  start_over_hint: { en: "You can start over anytime.", fil: "Puwede kang magsimula ulit anumang oras." },
} as const;

export type TextKey = keyof typeof TEXT;

/** Fixed app text. `{name}`-style placeholders are filled from `vars`. */
export function t(key: TextKey, lang: Lang = "en", vars: Record<string, string> = {}): string {
  return TEXT[key][lang].replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`);
}
