# GabAI front end (mobile, PWA)

Next.js (App Router) + React + TypeScript + Tailwind CSS v4 + shadcn/ui + lucide-react,
exported as a static site for Cloudflare Pages and installable as a progressive web app.
Front end only for now: the screens run on demo data (`lib/demo-data.ts`). The
`/api/intent`, `/api/roadmap` and `/api/ask` Workers will replace it.

## Run it

```bash
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

| Figma ("mobile ui" page) | Code |
| --- | --- |
| 01a–01e, 01 Splash (animated) | `components/gabai/splash.tsx` + `app/splash.css` (keyframes generated from the 6 frames) |
| 02–04 Intro 1–3 | `components/gabai/intro.tsx` |
| Start, Chat – roadmap bar, Step 3/4, Roadmap open, Step details, Map (light + dark) | `components/gabai/chat-screen.tsx`, `chat-parts.tsx`, `map-card.tsx` |
| Settings / Dark · Settings | `components/gabai/settings.tsx` |
| Colours, shadows, easing | `app/globals.css` (`:root` = light frames, `.dark` = "Dark ·" frames) |
| Logo, splash art, intro art, map pin | `components/gabai/artwork.tsx` (exact Figma vectors) |
| UI icons | lucide-react (`components/gabai/icons.tsx`) |
| shadcn/ui | `components/ui/button.tsx`, `components/ui/switch.tsx` |
| PWA | `public/manifest.webmanifest`, `public/sw.js`, `public/icons/`, `components/gabai/register-sw.tsx` |

Storage (per the stack): theme, language and "intro seen" in `localStorage`; the current
conversation (step, checklist ticks) in `sessionStorage` (`lib/storage.ts`).

Motion follows the Figma prototype: splash keyframes and timings, 0.3s between screens,
0.4s for the roadmap overlay, 0.2s dissolves for step details / map / step jumps, 0.15s for
checklist ticks, all on Figma's ease-out curve `cubic-bezier(0, 0, 0.58, 1)`.

## Known differences from Figma

- **Light Settings** has only the Dark mode card in Figma; Language and Privacy exist only on
  the dark frame. The app mirrors that.
- **Map greens:** parks `#D6EBDD` and the dark map background `#1D3230` are copied from Figma.
- **Intro** shows on first launch only; later launches go splash → chat.
- **Settings back** returns to the chat you were on (Figma links it to the Start screen).
- lucide-react's current glyphs can differ by a hair from the ones drawn in Figma.
