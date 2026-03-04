const fs = require('fs');

const locale = process.argv[2];
const newStringsArg = process.argv[3];

if (!locale || !newStringsArg) {
  console.error('Usage: node term-context.js <locale> <new-strings-json-or-file>');
  process.exit(1);
}

let newStrings;
if (fs.existsSync(newStringsArg)) {
  newStrings = JSON.parse(fs.readFileSync(newStringsArg, 'utf8'));
} else {
  newStrings = JSON.parse(newStringsArg);
}

// Normalize input: accept both [{ path, value }] array and { path: value } object
const newEntries = Array.isArray(newStrings)
  ? newStrings.map(s => ({ path: s.path, value: s.value }))
  : Object.entries(newStrings).map(([path, value]) => ({ path, value }));

const glossary = JSON.parse(fs.readFileSync('src/assets/translations/glossary.json', 'utf8'));
const glossaryTermsLower = new Set(
  Object.keys(glossary).filter(k => k !== '_meta').map(t => t.toLowerCase())
);

const en = JSON.parse(fs.readFileSync('src/assets/translations/en/main.json', 'utf8'));
const localeFile = `src/assets/translations/${locale}/main.json`;
if (!fs.existsSync(localeFile)) {
  console.error(`Locale file not found: ${localeFile}`);
  process.exit(1);
}
const localeData = JSON.parse(fs.readFileSync(localeFile, 'utf8'));

function flatten(obj, prefix) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result[path] = value;
    } else if (typeof value === 'object' && value !== null) {
      Object.assign(result, flatten(value, path));
    }
  }
  return result;
}

const flatEn = flatten(en, '');
const flatLocale = flatten(localeData, '');

const stopWords = new Set([
  'the','a','an','is','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','could','should','may','might','shall','can',
  'need','must','to','of','in','for','on','with','at','by','from','as','into',
  'through','during','before','after','above','below','between','out','off','over',
  'under','again','further','then','once','here','there','when','where','why','how',
  'all','both','each','few','more','most','other','some','such','no','not','only',
  'own','same','so','than','too','very','just','because','but','and','or','if',
  'while','about','up','it','its','this','that','these','those','my','your','his',
  'her','our','their','what','which','who','whom','we','you','they','me','him',
  'us','them','any','every','much','many','also','still','already','even','now',
  'get','got','make','made','let','set','put','take','come','go','see','know',
  'want','use','find','give','tell','say','try','keep','show','turn','move','run',
  'work','call','ask','look','new','old','big','small','long','short','high','low',
  'good','bad','great','little','right','left','first','last','next','back','well',
  'way','day','time','year','thing','per','been','please','don','doesn','didn',
  'won','isn','aren','wasn','weren','hasn','haven','hadn','couldn','shouldn',
  'wouldn','can','able','unable'
]);

const newStringPaths = new Set(newEntries.map(s => s.path));

// Extract significant terms from the new English strings
const termSet = new Set();
for (const { value } of newEntries) {
  const cleaned = value.toLowerCase().replace(/%\{\w+\}/g, '').replace(/[^a-z\s-]/g, ' ');
  const words = cleaned.split(/\s+/).filter(w => w.length >= 3);

  for (const word of words) {
    if (!stopWords.has(word) && !glossaryTermsLower.has(word)) {
      termSet.add(word);
    }
  }

  // Also extract 2-word phrases (catches compound terms like "liquidity pool", "gas fee")
  for (let i = 0; i < words.length - 1; i++) {
    if (!stopWords.has(words[i]) && !stopWords.has(words[i + 1])
        && !glossaryTermsLower.has(`${words[i]} ${words[i + 1]}`)) {
      termSet.add(`${words[i]} ${words[i + 1]}`);
    }
  }
}

// For each term, find existing translated strings that contain it in the English source
const MAX_MATCHES_PER_TERM = 3;
const termContext = {};

for (const term of termSet) {
  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escapedTerm}\\b`, 'i');
  const matches = [];

  for (const [path, enValue] of Object.entries(flatEn)) {
    if (newStringPaths.has(path)) continue;
    if (!flatLocale[path]) continue;
    if (!regex.test(enValue)) continue;

    matches.push({ key: path, en: enValue, [locale]: flatLocale[path] });
    if (matches.length >= MAX_MATCHES_PER_TERM) break;
  }

  if (matches.length > 0) {
    termContext[term] = matches;
  }
}

// Sort: phrases first (they're more specific/useful), then cap total
const sorted = Object.entries(termContext)
  .sort(([a], [b]) => {
    const aIsPhrase = a.includes(' ') ? 0 : 1;
    const bIsPhrase = b.includes(' ') ? 0 : 1;
    return aIsPhrase - bIsPhrase;
  })
  .slice(0, 30);

console.log(JSON.stringify(Object.fromEntries(sorted), null, 2));
