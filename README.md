# GabAI

A chat guide for city government services (Quezon City and Marikina today). Pick or type a service, answer a few questions, and get a step-by-step roadmap built from the official Citizen's Charters, with sources for every fact. Follow-up questions are answered by AI, only from the charters, with checked citations.

The plan, decisions and design are in [PLAN.md](PLAN.md). The knowledge base is explained in [knowledge/phase0/GUIDE.md](knowledge/phase0/GUIDE.md).

## Run it

Needs Node.js 20+ (and Python 3 only to rebuild the knowledge base).

```
npm install
npm run chat                  # terminal chat (AI on if .dev.vars has a Groq key)
npm run chat -- --fil         # in Filipino
npm run chat -- --offline     # without the AI helper
```

Through the HTTP API, the way the web UI will use it:

```
npm run dev                   # terminal 1: API on http://localhost:8787
npm run chat -- --api         # terminal 2: the same chat, through the API
```

In the chat: type a service or pick a number, then answer the questions. Once the roadmap shows: `n` next step, `r` roadmap, a number opens that step, `d` marks it done, `s` starts over, `q` quits, anything else is a question for the guide. `/help` lists everything.

## Check it

```
npm test                      # all tests, offline, no AI calls, free
npm run typecheck
npm run eval                  # quality check against the real AI model (uses Groq tokens; ~40 calls)
npm run eval -- --only "magkano"   # just matching cases
npm run ai:ping               # is the AI connection working?
npm run search -- "can my mom get it for me" --city qc   # try the charter search
```

## Secrets

Put them in `.dev.vars` (git-ignored), one `KEY=value` per line:

| Key | Needed for | Where to get it |
|---|---|---|
| `GROQ_API_KEY` | The AI helper | console.groq.com → API Keys |
| `CF_ACCOUNT_ID`, `CF_AIG_GATEWAY`, `CF_AIG_TOKEN` | Optional: route AI calls through Cloudflare AI Gateway | Cloudflare dashboard → AI → AI Gateway |

Leave the `CF_*` values empty to call Groq directly. When deployed, set the same values with `npx wrangler secret put <KEY>`.

## Update the knowledge base

After changing the Python data in `knowledge/tools/` or the Filipino in `knowledge/translations/tl.json`:

```
npm run kb:build              # rebuild graph.json, validate (27 journeys), reports, search index
npm test
```

Never edit `knowledge/phase0/graph.json` by hand.

## API

| Endpoint | Input → output |
|---|---|
| `POST /api/turn` | `{ state?, input }` → `{ state, events }`: the main chat endpoint |
| `POST /api/intent` | `{ text }` → `{ intent, by }` |
| `POST /api/roadmap` | `{ intent, answers, lang? }` → next question, roadmap, or "not covered" |
| `POST /api/ask` | `{ question, state }` → `{ text, citations }` |
| `GET /api/health` | status |

The server keeps no state: the client sends its conversation `state` with every request. Event and state shapes are in [src/core/events.ts](src/core/events.ts).

## Layout

```
knowledge/   Phase 0: charters, extracted text, Python build/validate tools, graph.json, translations
src/core/    the rulebook and conversation brain (no AI, no network)
src/search/  charter search index
src/llm/     AI helper (Groq): service guess, cited answers
src/worker/  HTTP API (Hono on Cloudflare Workers)
cli/         terminal chat
scripts/     build and check tools
test/        tests
```
