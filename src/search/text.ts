// Text processing shared by the index builder and the search: same options on both sides.
import type { Options } from "minisearch";

/** Words that carry no meaning for search, in English and Filipino. */
const STOP = new Set(
  (
    "a an the of to for in on at by with from and or is are was be been it its this that these those " +
    "i me my we our you your he she they them his her their what which who whom how when where why " +
    "can could do does did will would should may might must shall have has had not no yes if then so " +
    "just also there here about into than too very get got need needs want please po ba na ang ng sa " +
    "ko mo ka ako ikaw siya kami tayo kayo sila ito iyan iyon at ay mga kung para pwede puwede din rin " +
    "lang lamang naman ni nina kay kina may mayroon meron wala hindi oo ano paano saan sino kailan bakit"
  ).split(" "),
);

/** Lowercase, strip accents. */
export function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Index-side term processing: folded, stop words dropped. */
export function processIndexTerm(term: string): string | null {
  const t = fold(term);
  if (t.length < 2 || STOP.has(t)) return null;
  return t;
}

/**
 * Query-side synonyms: what people type → words the charters use. Includes Filipino.
 * Keys and values are folded (lowercase, no accents).
 */
const SYNONYMS: Record<string, string[]> = {
  // someone else filing for you
  representative: ["representative", "authorization", "authorized"],
  kinatawan: ["representative", "authorization", "authorized"],
  behalf: ["representative", "authorization"],
  someone: ["representative", "authorization"],
  mom: ["representative", "authorization"],
  mother: ["representative", "authorization"],
  nanay: ["representative", "authorization"],
  mama: ["representative", "authorization"],
  dad: ["representative", "authorization"],
  father: ["representative", "authorization", "father"],
  tatay: ["representative", "authorization"],
  anak: ["representative", "authorization", "child"],
  kapatid: ["representative", "authorization"],
  asawa: ["representative", "authorization", "spouse"],
  relative: ["representative", "authorization"],
  // money and time
  bayad: ["fee", "payment"],
  magkano: ["fee", "php"],
  cost: ["fee", "php"],
  price: ["fee", "php"],
  much: ["fee", "php"],
  libre: ["free", "none", "fee"],
  free: ["free", "none", "fee"],
  katagal: ["time", "minutes", "days"],
  tagal: ["time", "minutes", "days"],
  gaano: ["time"],
  long: ["time", "minutes", "days", "total"],
  araw: ["days"],
  oras: ["hours", "time"],
  // places and contact
  where: ["address", "office"],
  lokasyon: ["address", "office"],
  opisina: ["office"],
  phone: ["phone", "loc", "contact"],
  telepono: ["phone", "contact"],
  contact: ["contact", "phone"],
  number: ["phone", "number"],
  // documents
  requirements: ["requirements", "documentary"],
  dokumento: ["documents", "requirements"],
  kailangan: ["requirements"],
  dalhin: ["requirements", "bring"],
  bring: ["requirements", "bring"],
  litrato: ["photo", "picture"],
  picture: ["picture", "photo"],
  photo: ["photo", "picture"],
  kopya: ["copy", "certified", "true"],
  sulat: ["letter"],
  // life events
  kasal: ["married", "marriage"],
  sanggol: ["birth", "child", "live"],
  baby: ["birth", "child", "live"],
  newborn: ["birth", "child", "live"],
  ipinanganak: ["birth"],
  rehistro: ["registration", "register"],
  irehistro: ["registration", "register"],
  magparehistro: ["registration", "register"],
  // services
  renew: ["renewal", "renew"],
  irenew: ["renewal", "renew"],
  senior: ["senior", "citizen", "osca"],
  matanda: ["senior", "citizen"],
  doktor: ["doctor", "physician"],
  doctor: ["doctor", "physician", "medical"],
  gcash: ["gcash", "wallet", "payment"],
  online: ["online", "portal", "e-services"],
  automatic: ["auto", "renewing"],
  automatically: ["auto", "renewing"],
  valid: ["valid", "validity"],
};

/** Query-side term processing: like the index, plus synonym expansion. */
export function processQueryTerm(term: string): string[] | null {
  const t = processIndexTerm(term);
  if (!t) return null;
  const extra = SYNONYMS[t.replace(/-/g, "")] ?? [];
  return [...new Set([t, ...extra])];
}

/** MiniSearch options. Must be identical when building and when loading the index. */
export const MINI_OPTIONS: Options = {
  idField: "id",
  fields: ["title", "text"],
  storeFields: [],
  processTerm: processIndexTerm,
};

/** Collapse whitespace: PDF tables extract as ragged columns. */
export function squash(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}
