const fs = require('fs');

const LOCALE_META = {
  de: { language: 'German', register: 'Formal (Sie)' },
  es: { language: 'Spanish', register: 'Informal (tú)' },
  fr: { language: 'French', register: 'Formal (vous)' },
  ja: { language: 'Japanese', register: 'Polite (です/ます)' },
  pt: { language: 'Portuguese (BR)', register: 'Informal (você)' },
  ru: { language: 'Russian', register: 'Formal (вы)' },
  tr: { language: 'Turkish', register: 'Formal (siz)' },
  uk: { language: 'Ukrainian', register: 'Formal (ви)' },
  zh: { language: 'Chinese (Simplified)', register: 'Neutral/formal' },
};

const locale = process.argv[2];

if (!locale || !LOCALE_META[locale]) {
  console.error('Usage: node prepare-locale.js <locale> --batches=<file> [--term-context=<file>] [--few-shot=<file>] [--output=<file>]');
  console.error('Supported locales: ' + Object.keys(LOCALE_META).join(', '));
  process.exit(1);
}

let batchesPath;
let termContextPath;
let fewShotPath;
let outputPath = `/tmp/translate-${locale}.json`;

for (const arg of process.argv.slice(3)) {
  if (arg.startsWith('--batches=')) batchesPath = arg.slice('--batches='.length);
  if (arg.startsWith('--term-context=')) termContextPath = arg.slice('--term-context='.length);
  if (arg.startsWith('--few-shot=')) fewShotPath = arg.slice('--few-shot='.length);
  if (arg.startsWith('--output=')) outputPath = arg.slice('--output='.length);
}

if (!batchesPath) {
  console.error('Error: --batches=<file> is required');
  process.exit(1);
}

const meta = LOCALE_META[locale];

const localeRulesPath = `${__dirname}/../locales/${locale}.md`;
const localeRules = fs.existsSync(localeRulesPath)
  ? fs.readFileSync(localeRulesPath, 'utf8').trim()
  : '';

const glossaryPath = 'src/assets/translations/glossary.json';
if (!fs.existsSync(glossaryPath)) {
  console.error('Error: glossary file not found at ' + glossaryPath);
  process.exit(1);
}
const glossary = JSON.parse(fs.readFileSync(glossaryPath, 'utf8'));

const neverTranslate = Object.entries(glossary)
  .filter(([key, value]) => key !== '_meta' && value === null)
  .map(([key]) => key);

const approvedTerms = {};
for (const [term, value] of Object.entries(glossary)) {
  if (term === '_meta') continue;
  if (typeof value === 'object' && value !== null && value[locale]) {
    approvedTerms[term] = value[locale];
  }
}

const batches = JSON.parse(fs.readFileSync(batchesPath, 'utf8'));

let termContext = {};
if (termContextPath && fs.existsSync(termContextPath)) {
  termContext = JSON.parse(fs.readFileSync(termContextPath, 'utf8'));
}

let fewShot = {};
if (fewShotPath && fs.existsSync(fewShotPath)) {
  fewShot = JSON.parse(fs.readFileSync(fewShotPath, 'utf8'));
}

const bundle = {
  locale,
  language: meta.language,
  register: meta.register,
  localeRules,
  neverTranslate,
  approvedTerms,
  termContext,
  fewShot,
  batches: Array.isArray(batches) ? batches : [batches],
};

fs.writeFileSync(outputPath, JSON.stringify(bundle, null, 2) + '\n');
console.log(`Wrote locale bundle to ${outputPath}`);
