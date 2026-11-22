// Renders brain events as terminal text. One function per event type, mirroring the Figma components.
import { styleText } from "node:util";
import type { Event } from "../src/core/events";
import type { QuestionView } from "../src/core/questions";
import type { Citation, RoadmapView, StepCard } from "../src/core/view";

type Style = Parameters<typeof styleText>[0];

export interface RenderOptions {
  width: number;
  color: boolean;
}

export function makeRenderer(opts: RenderOptions) {
  const W = Math.max(48, Math.min(opts.width, 84));
  const c = (style: Style, s: string) => (opts.color ? styleText(style, s) : s);
  // eslint-disable-next-line no-control-regex
  const visible = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "").length;

  /** Word-wrap text to `width` columns, keeping deliberate runs of spaces inside a line. */
  const wrap = (text: string, width: number): string[] => {
    const lines: string[] = [];
    for (const para of text.split("\n")) {
      let line = "";
      // tokens: a word plus the spaces before it
      for (const [, gap, word] of para.trim().matchAll(/(\s*)(\S+)/g)) {
        if (line && visible(line) + visible(gap!) + visible(word!) > width) {
          lines.push(line);
          line = word!;
        } else line = line ? `${line}${gap}${word}` : word!;
      }
      lines.push(line);
    }
    return lines;
  };

  /** A box with a title bar: ┌─ Title ─── right ─┐ … └───┘ */
  const box = (title: string, right: string, body: string[]): string => {
    const inner = W - 4;
    const tail = right ? ` ${right} ─` : "─";
    const maxTitle = W - 6 - visible(tail);
    const t = visible(title) > maxTitle ? `${title.slice(0, maxTitle - 1)}…` : title;
    const head = `─ ${t} `;
    const fill = Math.max(1, W - 2 - visible(head) - visible(tail));
    const top = c("dim", "┌") + c("bold", head) + c("dim", "─".repeat(fill)) + c("dim", tail) + c("dim", "┐");
    const rows = body.flatMap((l) => (l === "" ? [""] : visible(l) <= inner ? [l] : wrapKeepIndent(l, inner)));
    const mid = rows.map((r) => `${c("dim", "│")} ${r}${" ".repeat(Math.max(0, inner - visible(r)))} ${c("dim", "│")}`);
    return [top, ...mid, c("dim", `└${"─".repeat(W - 2)}┘`)].join("\n");
  };

  /** Wrap a line, keeping its leading indent on continuation lines. */
  const wrapKeepIndent = (line: string, width: number): string[] => {
    const indent = /^\s*/.exec(line)![0];
    const hang = indent + (/^\s*(\d+\.|[☐☑•▸✓]|\[\w+\])\s/.test(line) ? "   " : "");
    // Wrap to the narrower (hanging) width so continuation lines fit too.
    const parts = wrap(line.trim(), width - hang.length);
    return parts.map((p, i) => (i === 0 ? indent : hang) + p);
  };

  const cite = (cs: Citation[]): string[] =>
    cs.length ? [c("dim", "Sources:"), ...cs.map((x) => c("dim", `  [${x.id}] ${x.source}, p. ${x.page}${x.status === "needs_review" ? " (to be reviewed)" : ""}`))] : [];

  const message = (text: string) => wrap(text, W - 2).map((l) => ` ${l}`).join("\n");

  const choices = (items: { label: string }[]): string => {
    const col = Math.floor((W - 4) / 2);
    const cells = items.map((it, i) => `${c("bold", `${i + 1})`)} ${it.label}`);
    const rows: string[] = [];
    for (let i = 0; i < cells.length; i += 2) {
      const a = cells[i]!;
      const b = cells[i + 1] ?? "";
      rows.push(`   ${a}${" ".repeat(Math.max(2, col - visible(a)))}${b}`);
    }
    return [...rows, c("dim", "   …or type what you need")].join("\n");
  };

  const question = (q: QuestionView): string => {
    const head = message(c("bold", q.text));
    if (q.input === "text") return head;
    const opts = q.options.map((o, i) => `${c("bold", `${i + 1})`)} ${o.label}`).join("   ");
    return `${head}\n   ${opts}`;
  };

  /** Two lines per step, like the Figma roadmap panel: title, then a dim "In person · Fee" line. */
  const stepLines = (s: StepCard, current: number | null, done: number[]): string[] => {
    const mark = done.includes(s.number) ? c("green", "✓") : s.number === current ? c("cyan", "▸") : " ";
    const meta =
      s.kind === "prepare"
        ? ["Prepare", s.where.office].filter(Boolean).join(" · ")
        : [s.channelLabel, s.fee].filter(Boolean).join(" · ");
    const pad = "        "; // same width as the " ✓ 12   " prefix
    const title = wrap(s.title, W - 4 - pad.length).map((l, i) => (i === 0 ? ` ${mark} ${String(s.number).padStart(2)}   ${l}` : pad + l));
    const sub = wrap(meta, W - 4 - pad.length).map((l) => pad + c("dim", l));
    return [...title, ...sub];
  };

  const roadmap = (v: RoadmapView, current: number | null, done: number[]): string => {
    const body: string[] = [c("dim", v.cityName)];
    for (const g of v.groups) {
      body.push("", c("dim", g.label.toUpperCase()));
      for (const s of g.steps) body.push(...stepLines(s, current, done));
    }
    body.push("", c("dim", v.disclaimer));
    return box(v.title, `${done.length}/${v.totalSteps} done`, body);
  };

  const step = (s: StepCard, total: number, isDone: boolean, doneSteps: number[] = []): string => {
    const body: string[] = [];
    const how = s.kind === "prepare" ? "Prepare this yourself" : s.channelLabel;
    body.push(c("dim", [how, s.where.office].filter(Boolean).join(" · ")));
    if (s.where.address) body.push(`Address: ${s.where.address}`);
    if (s.where.phone) body.push(`Phone: ${s.where.phone}`);
    if (s.bring.length) {
      body.push("", c("bold", "BRING"));
      for (const b of s.bring) {
        const ok = b.step !== null && doneSteps.includes(b.step);
        body.push(`  ${ok ? c("green", "☑") : "☐"} ${b.label}${b.step !== null ? c("dim", `  (step ${b.step})`) : ""}`);
      }
    }
    if (s.fee || s.time) {
      body.push("");
      if (s.fee) body.push(`${c("bold", "FEE")}   ${s.fee}`);
      if (s.time) body.push(`${c("bold", "TIME")}  ${s.time}`);
    }
    if (s.howTo.length) {
      body.push("", c("bold", "HOW"));
      s.howTo.forEach((h, i) => body.push(`  ${i + 1}. ${h}`));
    }
    if (s.hint) body.push("", `Tip: ${s.hint}`);
    if (s.note) body.push("", `Note: ${s.note}`);
    if (s.citations.length) body.push("", ...cite(s.citations));
    // Links go below the box, unbroken, so the terminal keeps them clickable.
    const links = [s.where.url && ` Link: ${s.where.url}`, s.where.mapUrl && ` Map:  ${s.where.mapUrl}`].filter(Boolean) as string[];
    return [box(`Step ${s.number} of ${total} · ${s.title}`, isDone ? c("green", "done") : "", body), ...links.map((l) => c("cyan", l))].join("\n");
  };

  /** Render one event. `ctx.done` lets step cards tick off items from finished steps. */
  const render = (e: Event, ctx: { done: number[] } = { done: [] }): string => {
    switch (e.type) {
      case "message":
        return message(e.text);
      case "choices":
        return choices(e.items);
      case "question":
        return question(e.question);
      case "roadmap":
        return roadmap(e.roadmap, e.current, e.done);
      case "step":
        return step(e.step, e.total, e.done, ctx.done);
      case "not_covered":
        return [message(c("yellow", e.message)), e.office ? message(c("dim", `Ask: ${e.office}`)) : ""].filter(Boolean).join("\n");
      case "answer":
        return [message(e.text), ...cite(e.citations).map((l) => ` ${l}`)].join("\n");
    }
  };

  /** One-line progress, used instead of re-printing the whole roadmap after each step change. */
  const progress = (v: RoadmapView, current: number | null, done: number[]) =>
    message(c("dim", `Progress: ${done.length}/${v.totalSteps} done${current ? ` · on step ${current}` : ""}   (r = full roadmap)`));

  return { render, message, progress };
}
