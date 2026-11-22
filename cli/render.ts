// Renders brain events as terminal text. One function per event type, mirroring the Figma components.
import { styleText } from "node:util";
import type { Action, Event } from "../src/core/events";
import type { ExplainOption } from "../src/core/explain";
import { t, type Lang, type TextKey } from "../src/core/i18n";
import type { QuestionView } from "../src/core/questions";
import type { Citation, RoadmapView, StepCard } from "../src/core/view";

type Style = Parameters<typeof styleText>[0];

export interface RenderOptions {
  width: number;
  color: boolean;
  /** Current language; read on every render so a /lang switch applies at once. */
  lang: () => Lang;
}

export function makeRenderer(opts: RenderOptions) {
  const W = Math.max(48, Math.min(opts.width, 84));
  const c = (style: Style, s: string) => (opts.color ? styleText(style, s) : s);
  const tr = (key: TextKey, vars: Record<string, string> = {}) => t(key, opts.lang(), vars);
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
    const shown = visible(title) > maxTitle ? `${title.slice(0, maxTitle - 1)}…` : title;
    const head = `─ ${shown} `;
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
    cs.length
      ? [
          c("dim", `${tr("label_sources")}:`),
          ...cs.map((x, i) => c("dim", `  [${i + 1}] ${x.source}, ${tr("label_page", { n: String(x.page) })}${x.status === "needs_review" ? ` ${tr("to_review")}` : ""}`)),
        ]
      : [];

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
    return [...rows, c("dim", `   ${tr("or_type")}`)].join("\n");
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
        ? [tr("prepare"), s.where.office].filter(Boolean).join(" · ")
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
    return box(v.title, tr("n_done", { n: String(done.length), total: String(v.totalSteps) }), body);
  };

  const step = (s: StepCard, total: number, isDone: boolean, doneSteps: number[] = []): string => {
    const body: string[] = [];
    const how = s.kind === "prepare" ? tr("prepare_yourself") : s.channelLabel;
    body.push(c("dim", [how, s.where.office].filter(Boolean).join(" · ")));
    if (s.where.address) body.push(`${tr("label_address")}: ${s.where.address}`);
    if (s.where.phone) body.push(`${tr("label_phone")}: ${s.where.phone}`);
    if (s.bring.length) {
      body.push("", c("bold", tr("label_bring")));
      for (const b of s.bring) {
        const ok = b.step !== null && doneSteps.includes(b.step);
        const ref = b.step !== null ? c("dim", `  (${tr("step_ref", { n: String(b.step) })})`) : "";
        body.push(`  ${ok ? c("green", "☑") : "☐"} ${b.label}${ref}`);
      }
    }
    if (s.fee || s.time) {
      // Pad FEE / TIME labels to the same width so the values line up in either language.
      const w = Math.max(tr("label_fee").length, tr("label_time").length) + 2;
      body.push("");
      if (s.fee) body.push(`${c("bold", tr("label_fee"))}${" ".repeat(w - tr("label_fee").length)}${s.fee}`);
      if (s.time) body.push(`${c("bold", tr("label_time"))}${" ".repeat(w - tr("label_time").length)}${s.time}`);
    }
    if (s.howTo.length) {
      body.push("", c("bold", tr("label_how")));
      s.howTo.forEach((h, i) => body.push(`  ${i + 1}. ${h}`));
    }
    if (s.hint) body.push("", `${tr("label_tip")}: ${s.hint}`);
    if (s.note) body.push("", `${tr("label_note")}: ${s.note}`);
    if (s.citations.length) body.push("", ...cite(s.citations));
    // Links go below the box, unbroken, so the terminal keeps them clickable.
    const links = [s.where.url && ` ${tr("label_link")}: ${s.where.url}`, s.where.mapUrl && ` ${tr("label_map")}: ${s.where.mapUrl}`].filter(Boolean) as string[];
    const title = `${tr("step_of", { n: String(s.number), total: String(total) })} · ${s.title}`;
    return [box(title, isDone ? c("green", tr("done_badge")) : "", body), ...links.map((l) => c("cyan", l))].join("\n");
  };

  /** "Not sure?" card: each option, numbered like the question, with what it changes. */
  const explain = (title: string, options: ExplainOption[]): string => {
    const lines = [c("dim", title)];
    options.forEach((o, i) => {
      const head = `${c("bold", `${i + 1})`)} ${c("bold", o.label)}`;
      lines.push(...wrapKeepIndent(`   ${head}`, W - 2));
      for (const e of o.effects) lines.push(...wrapKeepIndent(`      • ${e}`, W - 2));
    });
    return lines.map((l) => ` ${l}`).join("\n");
  };

  /** Terminal shortcut for each action (the web UI shows buttons instead). */
  const ACTION_KEYS: Record<Action["id"], string> = { restart: "s", show_roadmap: "r", start_journey: "g" };
  const actions = (items: Action[]) =>
    message([...items.map((a) => `${c("bold", `[${ACTION_KEYS[a.id]}]`)} ${a.label}`), `${c("bold", "[q]")} ${tr("action_quit")}`].join("   "));

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
        return [message(c("yellow", e.message)), e.office ? message(c("dim", tr("ask_office", { office: e.office }))) : ""].filter(Boolean).join("\n");
      case "answer":
        return [message(e.text), ...cite(e.citations).map((l) => ` ${l}`)].join("\n");
      case "actions":
        return actions(e.items);
      case "explain":
        return explain(e.title, e.options);
    }
  };

  /** One-line progress, used instead of re-printing the whole roadmap after each step change. */
  const progress = (v: RoadmapView, current: number | null, done: number[]) =>
    message(
      c(
        "dim",
        `${tr("cli_progress", { done: String(done.length), total: String(v.totalSteps) })}${current ? tr("cli_on_step", { n: String(current) }) : ""}   ${tr("cli_full_roadmap")}`,
      ),
    );

  return { render, message, progress };
}
