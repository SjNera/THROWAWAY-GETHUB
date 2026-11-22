# GabAI — Build Plan

Last updated: 2026-11-22

## 1. What we're building

A chat guide for city government services. A person says what they need ("PWD ID", "renew my business permit"), answers a few short questions, and gets a step-by-step **roadmap**: what to prepare, where to go, what it costs, how long it takes. Every fact links back to the official Citizen's Charter page it came from.

**Scope now:** the cities and services in `graph.json`. Today that is Quezon City and Marikina, 6 services each. The code is city-agnostic: adding a city is a data change, not a code change.

**This phase:** build the backend and a **terminal chat** first. The web UI (Figma: mobile + web) comes later and plugs into the same backend.

---

## 2. The big picture: two halves

```
                    ┌──────────────────────── THE BRAIN ────────────────────────┐
                    │                                                            │
 person ── types ──►│  RULEBOOK (no AI)                 AI HELPER                │
                    │  graph.json + engine              Groq models              │
                    │  · which service                  · understands free text  │
                    │  · which questions                · answers follow-ups     │
                    │  · the roadmap, fees, steps       · cites charter pages    │
                    │                                                            │
                    └────────────────────────────┬───────────────────────────────┘
                                                 │ events
                                   ┌─────────────┴─────────────┐
                                   ▼                           ▼
                              Terminal chat               Web UI (later)
```

**The rulebook** is deterministic: the same answers always give the same roadmap. All facts (requirements, fees, offices, times) come only from here.

**The AI helper** handles the fuzzy parts only: guessing the service from a sentence ("my lola needs an ID" → Senior ID) and answering questions in natural language, using retrieved charter text.

Why split it this way:
- **Facts can't be invented.** The AI never decides a fee or a requirement.
- **Cheap.** Most of the chat needs no AI call at all.
- **Testable.** The rulebook has exact expected outputs (27 test journeys already exist).

---

## 3. How one conversation flows

| # | Stage | What happens | Handled by | Event out |
|---|---|---|---|---|
| 1 | Greet | Show the services the graph knows | Rulebook | `choices` |
| 2 | Pick a service | Tap a choice, or type a sentence | Rulebook (exact match) → AI (if unclear) | `message` |
| 3 | City | "Which city is this for?" The person **types** the city (no option list). Covered → continue. Recognised but not covered → "**&lt;City&gt; will be covered soon.**" | Rulebook (name matching) | `question` (text input) / `not_covered` |
| 4 | Questions | Only the ones that change the roadmap ("Online or in person?") | Rulebook | `question` |
| 5 | Roadmap | Grouped steps: "any order" groups, then "last" | Rulebook | `roadmap` |
| 6 | Walk the steps | One step card at a time: what to bring, fee, time, office | Rulebook | `step` |
| 7 | Ask anything | "Can my mom file it for me?" → answer with sources | AI helper + search | `answer` |
| — | Outside scope | Service not offered in that city → say so, name the city's office to ask | Rulebook | `not_covered` |

The person can ask a question (stage 7) at any point; the chat then returns to where it was.

### How the typed city is understood

| Person types | Result |
|---|---|
| `Quezon City`, `QC`, `quezon`, `Marikina`, `marikina city`, small typos (`Marikna`) | Matched to a covered city → continue to stage 4 |
| A real city or municipality we don't cover yet (`Pasig`, `cebu city`) | `not_covered`: "**Pasig City will be covered soon.**" (name shown in its proper spelling). The person can type another city |
| Something that isn't a place (`asdf`, `tomorrow`) | Ask again: "I didn't catch the city. Which city is this for?" |

- Covered cities and their aliases come from `graph.json` (`cities[*].name` + `aliases`). No city names in code.
- "Real but not covered" is recognised using a static list of Philippine cities and municipalities (from the PSA's PSGC list), so we can show the proper name and avoid saying "Asdf will be covered soon."
- If the first message already names a city ("PWD ID in Marikina"), stage 3 is skipped.

---

## 4. Events: the contract between the brain and any screen

The brain never prints text or draws UI. It returns a list of **events**. Each screen decides how to show them.

| Event | Meaning | Terminal shows | Web UI shows (Figma) |
|---|---|---|---|
| `message` | Plain text from the guide | A line of text | Chat bubble |
| `choices` | Services to pick from | Numbered list | Service tiles |
| `question` | A question, either with fixed options (`input: choice`) or typed (`input: text`, e.g. the city) | Question + numbered options, or a plain prompt | Bubble + option chips, or bubble + the text box |
| `roadmap` | All steps, grouped | Boxed step list | Left roadmap panel |
| `step` | One step in detail | Step box | Step card + "Next step" |
| `answer` | AI answer + sources | Text + `[source, page]` | Answer bubble + citation links |
| `not_covered` | Outside what we know: "&lt;City&gt; will be covered soon.", or a service a city doesn't offer (+ office to ask) | Message (+ office) | Same |

**Why this matters:** the brain is built and tested once. The terminal and the web UI are two thin "screens" over the same events.

**State:** the server remembers nothing. The client (terminal or browser) keeps the conversation state and sends it with every turn:

```
turn(state, input)  →  { new state, events[] }
```

---

## 5. Code layout

```
THROWAWAY-GETHUB/
├─ PLAN.md                    this file
├─ package.json  tsconfig.json  vitest.config.ts  wrangler.toml
├─ .dev.vars                  local secrets (git-ignored)
│
├─ knowledge/                 PHASE 0: everything that builds graph.json (Python, build time)
│  ├─ qc-charters/            downloaded Quezon City charters (PDF)
│  ├─ mkn-charters/           downloaded Marikina charters (PDF + raw web pages)
│  ├─ extract/                page-by-page text from the PDFs
│  ├─ tools/                  build / validate / extract scripts
│  ├─ phase0/                 OUTPUT: graph.json, test_roadmaps.json, reference.html, GUIDE.md ...
│  └─ archive/                old QC-only backup (was _backup_pre_multicity)
│
├─ src/                       THE BRAIN (TypeScript, runtime)
│  ├─ core/                   rulebook: no AI, no network
│  │  ├─ graph.ts             load graph.json + types
│  │  ├─ engine.ts            roadmap builder (port of engine.py)
│  │  ├─ questions.ts         picks the next question to ask
│  │  ├─ city.ts              understands the typed city (covered / coming soon / not a place)
│  │  ├─ view.ts              turns roadmap steps into cards
│  │  ├─ conversation.ts      turn(state, input) → events
│  │  ├─ events.ts            event + state shapes (Zod)
│  │  └─ i18n.ts              English / Filipino fixed text
│  ├─ search/                 MiniSearch index over charter text
│  ├─ llm/                    AI helper: Groq client, intent guess, cited answers
│  └─ worker/                 API server (Hono on Cloudflare Workers)
│
├─ cli/                       TERMINAL CHAT (a screen over the events)
├─ scripts/                   build-time helpers (e.g. build the search index)
├─ test/                      Vitest tests
└─ web/                       WEB UI (later: Next.js)
```

**Runs with no internet and no keys:** `knowledge/` (after sources are downloaded), `src/core`, `src/search`, `cli` in offline mode, and most tests.
**Needs keys:** `src/llm` (Groq), and the AI Gateway if turned on.

---

## 6. The stack

### By layer

| Layer | Tool | What it's for |
|---|---|---|
| Knowledge (build time) | Python 3, PyMuPDF, PyYAML | Extract charter text, build and check `graph.json` |
| Knowledge (data) | `graph.json` | The rulebook: services, requirements, offices, questions, evidence |
| Brain | TypeScript | All runtime logic |
| Brain | Zod | Check inputs, events, and AI output shapes |
| Search | MiniSearch | Find charter passages for a question (index built ahead of time) |
| AI | Vercel AI SDK (`ai`, `@ai-sdk/groq`) | Call the models, structured output, streaming |
| AI | Groq: `openai/gpt-oss-20b` | Guess the service from free text |
| AI | Groq: `openai/gpt-oss-120b` | Answer follow-up questions with citations |
| AI (optional) | Cloudflare AI Gateway | Caching, rate limits, logs, fallback for AI calls |
| API | Cloudflare Workers + Hono | Host the API (`/api/turn`, `/api/ask`, ...) |
| API | Workers Rate Limiting, Hono `bodyLimit` | Stop spam and oversized requests |
| Dev | Node.js 20+, Wrangler | Run locally (`wrangler dev`), deploy |
| Testing | Vitest | Unit tests, engine parity tests, conversation tests |
| Web UI (later) | Next.js static export, React, Tailwind, shadcn/ui, lucide-react, `@ai-sdk/react` | The screens from Figma |
| Browser (later) | sessionStorage, localStorage | Conversation state per tab; theme and language settings |

### What changed from the original proposal, and why

| Change | Why |
|---|---|
| **One Worker** serves both the website files and the API (instead of Cloudflare Pages + a separate Worker) | One deploy, same address for site and API, no CORS setup |
| **AI Gateway** (optional) instead of a hand-written in-memory cache | Workers' memory is per-instance and short-lived, so a hand-made cache saves little. The gateway caches, rate-limits and logs for free |
| **Workers Rate Limiting binding** instead of custom rate limiting | Built in, less code |
| **New: question picker** (`questions.ts`) | The original plan went from intent straight to roadmap; nothing decided which questions to ask |
| **New: typed city + "coming soon"** (`city.ts`, city aliases in the graph, PH places list) | City is typed, not picked. Uncovered real cities get "&lt;City&gt; will be covered soon." |
| **New: `/api/turn`** as the main chat endpoint | One call per chat turn returns events. `/api/intent`, `/api/roadmap`, `/api/ask` stay as smaller endpoints |
| **New: event contract** | Lets the terminal and web UI share the same brain |
| **Filipino text stored in the data**, not translated by AI | Fees and requirements must never drift in translation |
| **Search index built ahead of time** | Faster startup on Workers |
| **Citation check** on AI answers | Any source the AI cites that wasn't actually retrieved is removed |
| PyMuPDF noted as the actual extractor (not pdfplumber) | Matches what `extract_mkn.py` uses |

### API endpoints

| Endpoint | Input | Output |
|---|---|---|
| `POST /api/turn` | state + user input | new state + events (main chat endpoint) |
| `POST /api/intent` | text | best-matching service (rulebook first, AI fallback) |
| `POST /api/roadmap` | intent + answers | roadmap, or "needs input" + next question |
| `POST /api/ask` | question + context | streamed answer + citations |

---

## 7. Rules we build by

1. **City-agnostic.** Cities, services and questions come from `graph.json`. No city names in code. The city is always typed, never picked from a list; any recognised city outside the graph gets "&lt;City&gt; will be covered soon."
2. **Facts only from the rulebook.** The AI may explain and rephrase, never state a fee, time or requirement that isn't in the retrieved sources.
3. **Every AI answer cites its sources**, and the citations are checked.
4. **The server keeps no state.** The client holds the conversation.
5. **Secrets live only in `.dev.vars` (local) or Cloudflare secrets (deployed).** Never in code, never in git.
6. **Never edit `graph.json` by hand.** Change the Python data files and rebuild (see `knowledge/phase0/GUIDE.md`).

---

## 8. Build plan

### Milestone 1: offline terminal chat (no AI, no keys, no cost) — ✅ done 2026-11-22

| Step | Build | Done when | Status |
|---|---|---|---|
| 1 | Project setup: package.json, TypeScript, Vitest, wrangler.toml, folder layout | `npm test` runs | ✅ |
| 2 | Port the engine to `engine.ts` | All 27 journeys in `test_roadmaps.json` match exactly | ✅ 27/27, strict equality (`validate.py` now also writes `test_cases.json`) |
| 3 | City matching + question picker | Typed city: covered names, aliases and typos match; uncovered real cities give "&lt;City&gt; will be covered soon."; non-places are asked again. Each journey then asks only the questions that change its roadmap | ✅ Property-tested on every service × city |
| 4 | Step view | Step output has: name, channel, office, address, what to bring, fee, time, link | ✅ Plus how-to steps and page citations |
| 5 | Conversation brain `turn()` | Tests walk full journeys through events, start to finish | ✅ |
| 6 | Terminal chat `npm run chat` | A person can go service → questions → roadmap → each step | ✅ 153 tests pass in total |

Notes from Milestone 1:
- The graph already had Tagalog text for some questions (`text_tl`) and service names (`aliases_tl`); the Filipino fix below completed the questions.
- Each variant's evidence links in the graph lack the city prefix (`svc:s-pwd-id:…`); `view.ts` resolves both forms. Fix at the source when the Python data is next edited.
- npm 12 blocks package install scripts by default; `workerd` and `esbuild` are approved in `package.json` (`allowScripts`).

Fixes after review (2026-11-22):
- **No dead ends.** New `actions` event: after the last step (Start over, View roadmap), after "not covered" (Start over), and after "coming soon" (Start over). Typed "start over" / "magsimula ulit" restarts (not while an option question is open). Once a journey ends, typing a service name starts a new one. Terminal: `s` start over, `q` quit.
- **Filipino mode.** All 20 questions have Filipino text (`text_tl`); the validator warns if one is missing. All fixed labels (step cards, roadmap, terminal hints and help) and the engine's fixed English values ("Not listed…", "Not covered in…") come from `i18n.ts`. `is_representative` reworded for every service ("Will a representative … file this for you?").

### Milestone 2: AI and API

| Step | Build | Done when |
|---|---|---|
| 7 | Search index over charter text | Searching "representative" returns the right charter passages |
| 8 | AI helper via Groq (+ gateway if set) | Free-text service guess works; follow-up answers cite real sources |
| 9 | API server: Hono on `wrangler dev` | Terminal chat runs against the local API instead of in-process |
| 10 | Polish: Filipino for graph content (notes, tips, how-to steps, "not covered" process messages), rate limits, citation checks, size limits | Tests pass for each |

### Later

- Web UI from the Figma prototypes (mobile + web), wired to `/api/turn` and `/api/ask`
- Deploy to Cloudflare, CI from GitHub
- Data: office hours, map coordinates, more cities

---

## 9. Expected output

### Terminal chat (end of Milestone 1, plus questions after Milestone 2)

Values below are illustrative; real ones come from `graph.json`.

```
$ npm run chat

 GabAI · terminal
 Hi! I'll walk you through a city service, one step at a time.
 What do you need today?

   1) PWD ID application        2) Senior citizen ID
   3) Business permit renewal   4) Building permit
   5) Birth certificate copy    6) Birth registration
   ...or type what you need

> 1

 Which city is this for?
> pasig

 Pasig City will be covered soon.
 You can type another city, or [s] start over.
> qc

 Got it — Quezon City.
 Do you want to apply online or in person?
   1) Online   2) In person
> 1

 ┌─ PWD ID roadmap ─────────────────────────────── 4 steps ─┐
 │ ANY ORDER                                                │
 │  1  Certificate of Disability      Prepare · specialist  │
 │  2  Barangay clearance             Prepare · barangay    │
 │  3  2x2 ID photo                   Prepare               │
 │ LAST                                                     │
 │  4  PWD ID application             Online · Free         │
 └──────────────────────────────────────────────────────────┘
 Confirm with the office before you go.

 [n] next step   [2] open step 2   [r] roadmap   or ask a question

> can my mom submit it for me?

 Yes, a representative can file for you if they bring ...
 Sources: [1] PDAO Citizen's Charter 2025, p. 41
```

### Tests

```
$ npm test
 ✓ test/engine.parity.test.ts      27 passed   (same roadmaps as engine.py)
 ✓ test/city.test.ts               (covered, alias, typo, coming soon, not a place)
 ✓ test/questions.test.ts
 ✓ test/conversation.test.ts
 ✓ test/citations.test.ts          (Milestone 2)
```

---

## 10. Setup and cost

### Setup checklist

- [x] Node.js 20+ (have v24), npm, Python 3.12, Git
- [x] Groq API key → `.dev.vars`
- [x] Cloudflare account + Account ID → `.dev.vars`
- [x] AI Gateway `gabai`, authenticated, token → `.dev.vars`
- [x] `npx wrangler login`
- [ ] Before public launch: **replace the Groq key and gateway token** (current ones were exposed in a chat session)

**Windows note:** run the terminal chat in Windows Terminal or the VS Code terminal. They show UTF-8 text (’, ₱, box lines) correctly; the old `cmd` window may not.

### Cost

- **Free plans fail, they don't charge.** Over the limit, Groq returns "rate limited" and Workers return errors. Charges start only if you add a card / upgrade.
- **The real cost is Groq usage** (AI tokens), with or without the gateway.
- **The gateway is free** for caching, rate limiting and analytics, and lowers Groq usage.
- **The gateway is optional:** leave the `CF_AIG_*` values empty in `.dev.vars` to call Groq directly.

---

## 11. Open items

All items below are decided (2026-11-22).

| Item | Decision |
|---|---|
| Directory restructure (section 5) | **Approved.** Flat `knowledge/` folder; Phase 0 scripts need no path changes. Rebuild + validate must give 0 errors, 27/27, and an unchanged `graph.json` apart from the build date |
| `�` characters in `graph.json` | **Closed.** Checked: 0 broken characters; they are curly apostrophes (’) shown wrongly by the terminal |
| Office hours, closed days | Not in the data; UI shows "Ask the office" |
| Map | **Now:** a Google Maps link built from the office address (Google drops a pin at the building/compound; floor and room stay in text). Offices with no address get no link. **Later:** add checked lat/lng per office to the data for exact pins and an in-app map |
| Start tiles | **Approved.** Generated from `graph.intents`; Figma tiles are samples only |
| City aliases (`QC`, `Lungsod Quezon` ...) | **Approved.** Add an `aliases` list per city in the Python data, rebuild `graph.json` |
| PH cities/municipalities list | **Approved.** From the PSA PSGC list, stored as a small JSON file. Tells "real city, coming soon" from "not a place" |
| City `question` in the graph | **Approved.** The app asks it as a typed question, not as fixed options |
| Filipino text | **Approved.** Fixed app text in `src/core/i18n.ts`; graph text gets a Filipino field next to each English one, using the graph's existing `_tl` suffix (`text_tl`, `aliases_tl`, and e.g. `note_tl` later) in the Python data. Drafted once at build time, reviewed by a Filipino speaker (listed in `review_list.md`). Fees, times and links are shared, never translated. **Official office and document names stay in English** (they match what's printed on forms and signs); the explanations around them are translated. Missing Filipino falls back to English and the validator lists it. Charter quotes stay in their original language. **Done:** questions + all fixed UI text. **Step 10:** notes, tips, how-to steps, process messages |
| `tools/__pycache__/*.pyc` tracked in git | **Approved.** Remove from git during the restructure |
| Empty `_tmp/` folder | **Approved.** Delete |
| Human review of the knowledge base | **Deferred.** Doesn't block the build. See `knowledge/phase0/review_list.md` |

### Working rules for this build

- Work happens on the branch `backend-terminal`, one commit per finished step.
- Package manager: npm.
