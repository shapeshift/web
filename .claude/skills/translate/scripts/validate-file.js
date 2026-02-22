const fs = require('fs');
const {
  flattenJson,
} = require('./script-utils');

const locale = process.argv[2];

if (!locale) {
  console.error('Usage: node validate-file.js <locale> [--pre-merge=<file>]');
  process.exit(1);
}

let preMergePath;

for (const arg of process.argv.slice(3)) {
  if (arg.startsWith('--pre-merge=')) preMergePath = arg.slice('--pre-merge='.length);
}

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

// Check 3: No regression — if pre-merge backup provided, check no keys were deleted or corrupted
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
