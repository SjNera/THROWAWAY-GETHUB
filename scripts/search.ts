// Try the search from the terminal:
//   npm run search -- "can my mom get my birth certificate for me" --city qc [--service qc.s-birth-ctc]
import { search } from "../src/search/search";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const question = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--")).join(" ");
const city = flag("city") ?? "qc";
const service = flag("service");

if (!question) {
  console.log('Usage: npm run search -- "your question" --city qc|mkn [--service <service id>]');
  process.exit(1);
}
for (const [i, h] of search(question, { city, services: service ? [service] : [], limit: 5 }).entries()) {
  console.log(`${i + 1}. [${h.passage.id}] ${h.passage.title}  (score ${h.score.toFixed(1)})`);
  console.log(`   ${h.snippet}\n`);
}
