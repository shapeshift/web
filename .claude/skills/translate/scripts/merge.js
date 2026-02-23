const fs = require('fs');

const ALLOWED_LOCALES = ['de', 'es', 'fr', 'ja', 'pt', 'ru', 'tr', 'uk', 'zh'];

const enKeys = JSON.parse(fs.readFileSync('src/assets/translations/en/main.json', 'utf8'));
const locale = process.argv[2];
if (!ALLOWED_LOCALES.includes(locale)) {
  console.error(`Invalid locale "${locale}". Allowed: ${ALLOWED_LOCALES.join(', ')}`);
  process.exit(1);
}
const translationsArg = process.argv[3];

let newTranslations;
if (translationsArg && (translationsArg.includes('/') || translationsArg.endsWith('.json'))) {
  if (!fs.existsSync(translationsArg)) {
    console.error(`File not found: ${translationsArg}`);
    process.exit(1);
  }
  newTranslations = JSON.parse(fs.readFileSync(translationsArg, 'utf8'));
} else {
  newTranslations = JSON.parse(translationsArg);
}

const localeFilePath = 'src/assets/translations/' + locale + '/main.json';
const existing = JSON.parse(fs.readFileSync(localeFilePath, 'utf8'));

// Pre-merge backup for rollback support
const backupPath = `/tmp/pre-merge-${locale}.json`;
fs.writeFileSync(backupPath, JSON.stringify(existing, null, 2) + '\n');

const forceOverwrite = process.argv.includes('--force');

function getByPath(obj, path) {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
}

function setByPath(obj, path, value) {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

function orderLike(template, target) {
  if (typeof template !== 'object' || template === null) return target;
  const ordered = {};
  for (const key of Object.keys(template)) {
    if (key in target) {
      if (typeof template[key] === 'object' && template[key] !== null && typeof target[key] === 'object' && target[key] !== null) {
        ordered[key] = orderLike(template[key], target[key]);
      } else {
        ordered[key] = target[key];
      }
    }
  }
  for (const key of Object.keys(target)) {
    if (!(key in ordered)) ordered[key] = target[key];
  }
  return ordered;
}

let added = 0;
let skipped = 0;
for (const [path, value] of Object.entries(newTranslations)) {
  const existingValue = getByPath(existing, path);
  if (existingValue !== undefined && !forceOverwrite) {
    skipped++;
    continue;
  }
  setByPath(existing, path, value);
  added++;
}

const ordered = orderLike(enKeys, existing);
fs.writeFileSync(localeFilePath, JSON.stringify(ordered, null, 2) + '\n');
console.log('Merged ' + added + ' new translations into ' + locale + ' (' + skipped + ' existing skipped, backup: ' + backupPath + ')');
