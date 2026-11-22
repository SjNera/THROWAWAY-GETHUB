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
  action_restart: { en: "Start over", fil: "Magsimula ulit" },
  action_show_roadmap: { en: "View roadmap", fil: "Tingnan ang roadmap" },
  action_quit: { en: "Quit", fil: "Lumabas" },
  suggest_intent: { en: "Sounds like {name}. Is that right?", fil: "Mukhang {name} ito. Tama ba?" },
  ask_not_found: {
    en: "I couldn't find that in the city's charters. Please ask {office}.",
    fil: "Hindi ko ito nakita sa mga charter ng lungsod. Magtanong sa {office}.",
  },
  ask_not_found_generic: {
    en: "I couldn't find that in the city's charters. Please confirm with the city office.",
    fil: "Hindi ko ito nakita sa mga charter ng lungsod. Kumpirmahin sa opisina ng lungsod.",
  },
  ask_error: {
    en: "I can't answer questions right now. The steps still work.",
    fil: "Hindi ako makasagot ng tanong ngayon. Gumagana pa rin ang mga hakbang.",
  },

  // Explaining a question ("not sure") and going back
  explain_intro: { en: "Here's what each answer changes:", fil: "Ito ang nagbabago sa bawat sagot:" },
  explain_adds_step: { en: "Adds a step: {title}", fil: "May dagdag na hakbang: {title}" },
  explain_bring: { en: "You'll need: {item}", fil: "Kakailanganin mo: {item}" },
  explain_bring_for: { en: "For {title}, you'll need: {item}", fil: "Para sa {title}, kakailanganin mo: {item}" },
  explain_where:{ en: "{title}: {how}", fil: "{title}: {how}" },
  explain_fee: { en: "{title} fee: {fee}", fil: "Bayad sa {title}: {fee}" },
  explain_time: { en: "{title} takes: {time}", fil: "Tagal ng {title}: {time}" },
  explain_ends: { en: "The guide stops here: {message}", fil: "Dito natatapos ang gabay: {message}" },
  explain_continues: { en: "We continue with your steps.", fil: "Tuloy tayo sa iyong mga hakbang." },
  explain_same: { en: "Your steps stay the same.", fil: "Pareho lang ang iyong mga hakbang." },
  explain_unavailable: { en: "Just pick the answer that fits you.", fil: "Piliin lang ang sagot na akma sa iyo." },
  understood_as: { en: "Got it: {label}. (Type 'back' to change it.)", fil: "Sige: {label}. (I-type ang 'bumalik' para palitan.)" },
  switch_service: { en: "Switch to {name}? Your answers so far will be cleared.", fil: "Lumipat sa {name}? Mabubura ang mga sagot mo sa ngayon." },
  already_on_service: { en: "We're already on {name}.", fil: "Nasa {name} na tayo." },
  chitchat: { en: "I'm GabAI. I help with city government services, one step at a time.", fil: "Ako si GabAI. Tumutulong ako sa mga serbisyo ng lungsod, isa-isang hakbang." },
  i_can_help_with: { en: "Here's what I can help with:", fil: "Ito ang maitutulong ko:" },
  went_back: { en: "Okay, let's go back.", fil: "Sige, balikan natin." },
  nothing_to_undo: { en: "There's nothing to go back to.", fil: "Wala nang mababalikan." },

  // Fixed values the engine produces in English (kept English there for parity with engine.py)
  not_listed: { en: "Not listed — confirm with the office", fil: "Hindi nakalista — kumpirmahin sa opisina" },
  not_covered_service: { en: "This service isn't covered yet.", fil: "Hindi pa sakop ang serbisyong ito." },
  not_covered_in_city: { en: "Not covered in {city} yet.", fil: "Hindi pa ito sakop sa {city}." },

  // Labels for step cards and the roadmap (terminal now, web UI later)
  or_type: { en: "…or type what you need", fil: "…o i-type ang kailangan mo" },
  prepare: { en: "Prepare", fil: "Ihanda" },
  prepare_yourself: { en: "Prepare this yourself", fil: "Ikaw mismo ang maghahanda nito" },
  step_of: { en: "Step {n} of {total}", fil: "Hakbang {n} sa {total}" },
  step_ref: { en: "step {n}", fil: "hakbang {n}" },
  done_badge: { en: "done", fil: "tapos" },
  n_done: { en: "{n}/{total} done", fil: "{n}/{total} tapos" },
  label_bring: { en: "BRING", fil: "DALHIN" },
  label_fee: { en: "FEE", fil: "BAYAD" },
  label_time: { en: "TIME", fil: "TAGAL" },
  label_how: { en: "HOW", fil: "PAANO" },
  label_address: { en: "Address", fil: "Lokasyon" },
  label_phone: { en: "Phone", fil: "Telepono" },
  label_link: { en: "Link", fil: "Link" },
  label_map: { en: "Map", fil: "Mapa" },
  label_tip: { en: "Tip", fil: "Payo" },
  label_note: { en: "Note", fil: "Paalala" },
  label_sources: { en: "Sources", fil: "Pinagkunan" },
  label_page: { en: "p. {n}", fil: "p. {n}" },
  to_review: { en: "(to be reviewed)", fil: "(susuriin pa)" },
  ask_office: { en: "Ask: {office}", fil: "Magtanong sa: {office}" },

  // Terminal-only
  cli_banner: { en: "GabAI · terminal   (/help for commands)", fil: "GabAI · terminal   (/help para sa mga utos)" },
  cli_progress: { en: "Progress: {done}/{total} done", fil: "Progreso: {done}/{total} tapos" },
  cli_on_step: { en: " · on step {n}", fil: " · nasa hakbang {n}" },
  cli_full_roadmap: { en: "(r = full roadmap)", fil: "(r = buong roadmap)" },
  cli_step_hints: {
    en: "[n] next step   [r] roadmap   [<number>] open a step   [d] mark done   or ask a question",
    fil: "[n] susunod   [r] roadmap   [<numero>] buksan ang hakbang   [d] tapos na   o magtanong",
  },
  cli_help: {
    en: `Commands (anytime):
  /next  /roadmap  /step <n>  /done <n>  /undo <n>  /back  /restart  /lang en|fil  /help  /quit
Anytime:
  b = go back one answer (or type "back")
While a question is open:
  ? = what each answer changes (or type "not sure")
Whenever no question is open:
  s = start over   q = quit   (or type "start over")
Once your roadmap is showing (and no question is open):
  n = next step   r = roadmap   <number> = open that step   d = mark this step done
Anything else you type is sent to the guide.`,
    fil: `Mga utos (kahit kailan):
  /next  /roadmap  /step <n>  /done <n>  /undo <n>  /back  /restart  /lang en|fil  /help  /quit
Kahit kailan:
  b = bumalik ng isang sagot (o i-type ang "bumalik")
Habang may bukas na tanong:
  ? = ano ang nagbabago sa bawat sagot (o i-type ang "hindi ko alam")
Kapag walang bukas na tanong:
  s = magsimula ulit   q = lumabas   (o i-type ang "magsimula ulit")
Kapag nakikita na ang roadmap (at walang bukas na tanong):
  n = susunod na hakbang   r = roadmap   <numero> = buksan ang hakbang   d = tapos na ang hakbang
Ang iba pang i-type mo ay ipapadala sa gabay.`,
  },
} as const;

export type TextKey = keyof typeof TEXT;

/** Fixed app text. `{name}`-style placeholders are filled from `vars`. */
export function t(key: TextKey, lang: Lang = "en", vars: Record<string, string> = {}): string {
  return TEXT[key][lang].replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`);
}
