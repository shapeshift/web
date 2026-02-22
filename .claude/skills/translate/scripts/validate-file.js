const fs = require('fs');
const {
  CJK_LOCALES,
  CYRILLIC_LOCALES,
  NON_LATIN_LOCALES,
  latinRatio,
  cyrillicRatio,
  cjkRatio,
  loadGlossary,
  glossaryTerms: getGlossaryTerms,
  flattenJson,
} = require('./script-utils');

const locale = process.argv[2];

if (!locale) {
  console.error('Usage: node validate-file.js <locale> [--pre-merge=<file>] [--glossary=<file>]');
  process.exit(1);
}

let preMergePath;
let glossaryPath = 'src/assets/translations/glossary.json';

for (const arg of process.argv.slice(3)) {
  if (arg.startsWith('--pre-merge=')) preMergePath = arg.slice('--pre-merge='.length);
  if (arg.startsWith('--glossary=')) glossaryPath = arg.slice('--glossary='.length);
}

const glossary = loadGlossary(glossaryPath);
const terms = getGlossaryTerms(glossary);

const errors = [];
const warnings = [];

// Check 1: JSON validity — read and parse the locale file
const localeFilePath = `src/assets/translations/${locale}/main.json`;
let localeData;
try {
  const raw = fs.readFileSync(localeFilePath, 'utf8');
  localeData = JSON.parse(raw);
} catch (e) {
  errors.push(`JSON parse error: ${e.message}`);
  console.log(JSON.stringify({ valid: false, errors, warnings }));
  process.exit(0);
}

// Flatten for inspection
const flatLocale = flattenJson(localeData, '');

// Check 2: Key completeness — every English key should exist in locale
let enData;
try {
  enData = JSON.parse(fs.readFileSync('src/assets/translations/en/main.json', 'utf8'));
} catch (e) {
  errors.push(`Cannot read English file: ${e.message}`);
  console.log(JSON.stringify({ valid: false, errors, warnings }));
  process.exit(0);
}

const flatEn = flattenJson(enData, '');
const missingKeys = [];
for (const key of Object.keys(flatEn)) {
  if (!(key in flatLocale)) {
    missingKeys.push(key);
  }
}
if (missingKeys.length > 0) {
  warnings.push(`${missingKeys.length} English keys missing from ${locale} (expected for incremental translation)`);
}

// Check 3: Aggregate script ratio for non-Latin locales
if (NON_LATIN_LOCALES.has(locale)) {
  let checked = 0;
  let failed = 0;

  for (const value of Object.values(flatLocale)) {
    if (typeof value !== 'string') continue;
    const cleaned = value.replace(/%\{\w+\}/g, '').replace(/\s+/g, '');
    if (cleaned.length <= 3) continue;

    checked++;

    const lr = latinRatio(value, terms);
    if (lr > 0.7) { failed++; continue; }

    if (CYRILLIC_LOCALES.has(locale)) {
      const cr = cyrillicRatio(value, terms);
      if (cr < 0.3) { failed++; continue; }
    }
    if (CJK_LOCALES.has(locale)) {
      const cr = cjkRatio(value, terms);
      if (cr < 0.3) { failed++; continue; }
    }
  }

  if (checked > 0) {
    const failRate = failed / checked;
    if (failRate > 0.05) {
      errors.push(`${failed}/${checked} strings (${(failRate * 100).toFixed(1)}%) fail script detection for ${locale} — exceeds 5% threshold`);
    } else if (failRate > 0.02) {
      warnings.push(`${failed}/${checked} strings (${(failRate * 100).toFixed(1)}%) fail script detection for ${locale} — below error threshold but notable`);
    }
  }
}

// Check 4: No regression — if pre-merge backup provided, check no keys were deleted or corrupted
if (preMergePath && fs.existsSync(preMergePath)) {
  let preMergeData;
  try {
    preMergeData = JSON.parse(fs.readFileSync(preMergePath, 'utf8'));
  } catch (e) {
    warnings.push(`Could not parse pre-merge backup: ${e.message}`);
  }

  if (preMergeData) {
    const flatPreMerge = flattenJson(preMergeData, '');
    const deletedKeys = [];
    for (const key of Object.keys(flatPreMerge)) {
      if (!(key in flatLocale)) {
        deletedKeys.push(key);
      }
    }
    if (deletedKeys.length > 0) {
      errors.push(`${deletedKeys.length} existing keys were deleted during merge: ${deletedKeys.slice(0, 5).join(', ')}${deletedKeys.length > 5 ? '...' : ''}`);
    }
  }
}

const valid = errors.length === 0;
console.log(JSON.stringify({ valid, errors, warnings }, null, 2));
