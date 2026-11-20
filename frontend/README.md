# GabAI front end (mobile, PWA)

Everything for the front end lives in this `frontend/` folder. The rest of the repo
(`extract/`, `tools/`, `phase0/`, the charters) is the data pipeline and isn't touched here.

Next.js (App Router) + React + TypeScript + Tailwind CSS v4 + shadcn/ui + lucide-react,
exported as a static site for Cloudflare Pages and installable as a progressive web app.
Front end only for now: the screens run on demo data (`lib/demo-data.ts`). The
`/api/intent`, `/api/roadmap` and `/api/ask` Workers will replace it.

## Run it

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000; open it on your phone at http://<your-PC-IP>:3000
npm run build      # static site in out/ (what Cloudflare Pages serves)
npm start          # serves out/ locally to test the installable PWA
```

Node 20+. The service worker only registers in production builds (`npm run build && npm start`),
so the dev server always shows your latest changes.

## Install on a phone

Deploy (or run `npm start`) over HTTPS, open it in Chrome (Android) → menu → **Install app**,
or Safari (iPhone) → Share → **Add to Home Screen**. It opens full-screen with the GabAI icon.

## Where things are

```
frontend/
├─ app/                    Next.js App Router
│  ├─ layout.tsx           fonts, PWA metadata, dark-mode boot script
│  ├─ page.tsx             renders <GabaiApp/>
│  ├─ globals.css          Figma colour tokens (:root light, .dark), shadows, animations
│  └─ splash.css           splash keyframes (generated from the 6 Figma splash frames)
├─ components/
│  ├─ gabai-app.tsx        app state + navigation (splash → intro → chat ⇄ settings)
│  ├─ register-sw.tsx      registers the PWA service worker (production only)
│  ├─ screens/             splash, intro (swipe carousel), chat-screen (+ roadmap drawer), settings
│  ├─ chat/                chat building blocks (header, bubbles, step card, rows) and map card
│  ├─ motion/              screen-stack (push/pop) and cross-fade (drawer view swaps)
│  ├─ brand/               artwork (exact Figma vectors) and icons (lucide-react)
│  └─ ui/                  shadcn/ui: button, switch
├─ lib/
│  ├─ demo-data.ts         PWD ID demo content (to be replaced by /api/roadmap)
│  ├─ chat-thread.ts       chat message model (append-only conversation)
│  ├─ storage.ts           localStorage (prefs) / sessionStorage (conversation)
│  └─ utils.ts             cn() helper (shadcn)
└─ public/                 manifest.webmanifest, sw.js, app icons
```

Storage (per the stack): theme, language and "intro seen" in `localStorage`; the current
conversation (step, checklist ticks) in `sessionStorage` (`lib/storage.ts`).

Motion started from the Figma prototype: splash keyframes and timings, 0.3s between screens,
0.4s for the roadmap overlay, 0.2s dissolves for step details / map / step jumps, 0.15s for
checklist ticks, all on Figma's ease-out curve `cubic-bezier(0, 0, 0.58, 1)`.

## Changes from Figma (requested in review)

- **Roadmap** is a pull-down drawer with a handle: drag the handle or bar down to open, up to
  close (tap still toggles). It slides out of the bar and follows the finger.
- **Every step** (card or roadmap row) opens its own details; "Get directions" + map appear for
  in-person steps.
- **Done steps:** a step is done once all its bring items are ticked. Nothing starts ticked
  (step 1, Certificate of Disability, is already done in this demo).
- **Chat is one continuous conversation** (`lib/chat-thread.ts`): picking a service or "Next step"
  adds the user message, bot reply and step card to the bottom; earlier steps stay above and
  the chat scrolls. Only the newest card has "Next step". The bot avatar is the GabAI logo.
- **Native-style motion:** screens push in from the right and pop back (`screen-stack.tsx`), the
  intro is a swipeable carousel, chat messages rise in one after another.
- **Settings** has only the Dark mode card, in light and dark mode.

## Known differences from Figma

- **Map greens:** parks `#D6EBDD` and the dark map background `#1D3230` are copied from Figma.
- **Intro** shows on first launch only; later launches go splash → chat.
- **Settings back** returns to the chat you were on (Figma links it to the Start screen).
- lucide-react's current glyphs can differ by a hair from the ones drawn in Figma.
