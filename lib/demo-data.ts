// Demo content shown in the Figma mobile frames (PWD ID roadmap).
// Front end only for now: later this comes from /api/intent and /api/roadmap
// (lib/engine.ts + phase0/graph.json) on Cloudflare Workers.

export type ServiceIcon = 'access' | 'store' | 'users' | 'idcard';
export type Service = { key: string; label: string; icon: ServiceIcon };

export const SERVICES: Service[] = [
  { key: 'pwd', label: 'PWD ID', icon: 'access' },
  { key: 'business', label: 'Business permit', icon: 'store' },
  { key: 'senior', label: 'Senior ID', icon: 'users' },
  { key: 'qcitizen', label: 'QCitizen ID', icon: 'idcard' },
];

export type StepNo = 1 | 2 | 3 | 4;
export type Step = {
  n: StepNo;
  title: string;
  meta: string; // subtitle in the roadmap list
  inPerson?: boolean; // has an office to visit → "Get directions" + map
  where?: string; // who issues it, when it's not an office visit
  tip?: string;
  chip: string; // chip under the title in the step card
  bring: string[];
  bringDefault: boolean[];
  fee: string;
  time: string;
  userSays: string;
  botSays: string;
};

export const ROADMAP_TITLE = 'PWD ID roadmap';

// Step 1 is already finished in this demo; any other step is done once every bring item is ticked.
export const isDone = (n: StepNo, checks: Record<number, boolean[]>) =>
  n === 1 || (STEPS[n].bring.length > 0 && (checks[n] ?? []).length === STEPS[n].bring.length && checks[n].every(Boolean));

export const STEPS: Record<StepNo, Step> = {
  1: {
    n: 1,
    title: 'Certificate of Disability',
    meta: 'From a specialist doctor',
    chip: 'From a specialist doctor',
    // From phase0/graph.json (qc.r-cert-disability)
    where: 'A specialist doctor for your disability type',
    tip: 'Must be signed by the specialist for your disability type, not a family doctor or general physician.',
    bring: [],
    bringDefault: [],
    fee: '',
    time: '',
    userSays: '',
    botSays: '',
  },
  2: {
    n: 2,
    title: 'Barangay clearance',
    meta: 'In person · Varies',
    inPerson: true,
    chip: 'In person · Barangay hall',
    bring: ['Valid ID + photocopy', 'Proof of residence', 'Filled-out form', 'Cash for fees'],
    bringDefault: [false, false, false, false],
    fee: 'Varies',
    time: 'Ask office',
    userSays: 'PWD ID',
    botSays: 'Got it. Here’s your next step. Tap it to open your full roadmap.',
  },
  3: {
    n: 3,
    title: 'QC e-Services account',
    meta: 'Online · Free',
    chip: 'Online · Free',
    bring: ['Valid ID photo', 'Email address', 'Mobile number'],
    bringDefault: [false, false, false],
    fee: 'Free',
    time: '10 minutes',
    userSays: 'Next step',
    botSays: 'Great! On to step 3 of 4. This one is online.',
  },
  4: {
    n: 4,
    title: 'Submit application',
    meta: 'Online · ₱ TBD',
    chip: 'Online · ₱ TBD',
    bring: ['Completed form', 'Valid ID photo', 'Payment method'],
    bringDefault: [false, false, false],
    fee: '₱ TBD',
    time: 'Same day',
    userSays: 'Next step',
    botSays: 'Last step! Submit your application online.',
  },
};

export const OFFICE_ROWS: [string, string][] = [
  ['Address', 'Your barangay hall'],
  ['Hours', 'Mon–Fri, 8 AM–5 PM'],
  ['Closed', 'Weekends & holidays'],
  ['Queue tip', 'Arrive before 10 AM'],
  ['Hotline', 'Ask the office'],
];

export const INTRO = [
  {
    icon: 'search' as const,
    title: 'Tell us what you need',
    body: 'Ask about any process, like getting a PWD ID or a business permit.',
    button: 'Next',
    back: '#F5E6D3',
    accent: '#A8500C',
  },
  {
    icon: 'chat' as const,
    title: 'Answer a few quick questions',
    body: 'Just yes or no, so we know what applies to you.',
    button: 'Next',
    back: '#FFE9CC',
    accent: '#A8500C',
  },
  {
    icon: 'route' as const,
    title: 'Get your step-by-step roadmap',
    body: 'See which offices to visit, what papers to bring, and the fees.',
    button: 'Start',
    back: '#FFE9CC',
    accent: '#D17A2A',
  },
];
