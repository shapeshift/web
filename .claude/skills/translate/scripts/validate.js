const fs = require('fs');
const {
  CJK_LOCALES,
  LOCALE_CONFIGS,
  extractPlaceholders,
  stripPlaceholders,
  stemMatch,
  loadGlossary,
} = require('./script-utils');

const locale = process.argv[2];
const sourceArg = process.argv[3];
const targetArg = process.argv[4];

if (!locale || !sourceArg || !targetArg) {
  console.error('Usage: node validate.js <locale> <source-json> <target-json> [--term-context=<file>] [--glossary=<file>]');
  process.exit(1);
}

function loadJsonArg(arg) {
  if (fs.existsSync(arg)) return JSON.parse(fs.readFileSync(arg, 'utf8'));
  return JSON.parse(arg);
}

const source = loadJsonArg(sourceArg);
const target = loadJsonArg(targetArg);

let termContextPath;
let glossaryPath = 'src/assets/translations/glossary.json';

for (const arg of process.argv.slice(5)) {
  if (arg.startsWith('--term-context=')) termContextPath = arg.slice('--term-context='.length);
  if (arg.startsWith('--glossary=')) glossaryPath = arg.slice('--glossary='.length);
}

const glossary = loadGlossary(glossaryPath);

let termContext = {};
if (termContextPath && fs.existsSync(termContextPath)) {
  termContext = JSON.parse(fs.readFileSync(termContextPath, 'utf8'));
}

const rejected = [];
const flagged = [];
const passed = [];

// Check 0: Key set validation
const sourceKeys = new Set(Object.keys(source));
const targetKeys = new Set(Object.keys(target));

for (const key of targetKeys) {
  if (!sourceKeys.has(key)) {
    rejected.push({ path: key, reason: 'unexpected key', details: 'Key not in input batch — translator may have hallucinated a different key path' });
  }
}
for (const key of sourceKeys) {
  if (!targetKeys.has(key)) {
    rejected.push({ path: key, reason: 'missing key', details: 'Key was in input batch but missing from translator output' });
  }
}

const rejectedPaths = new Set(rejected.map(r => r.path));

for (const path of Object.keys(source)) {
  if (rejectedPaths.has(path)) continue;

  const src = source[path];
  const tgt = target[path];

  // Check 3: Empty/whitespace
  if (tgt === undefined || tgt === null || (typeof tgt === 'string' && tgt.trim() === '')) {
    rejected.push({ path, reason: 'empty', details: 'Translated value is empty or whitespace-only' });
    continue;
  }

  // Check 1: Placeholder integrity
  const srcPlaceholders = extractPlaceholders(src);
  const tgtPlaceholders = extractPlaceholders(tgt);
  const srcSet = [...srcPlaceholders].sort().join(',');
  const tgtSet = [...tgtPlaceholders].sort().join(',');

  if (srcSet !== tgtSet) {
    rejected.push({ path, reason: 'placeholder mismatch', details: `Source: {${srcSet}} Target: {${tgtSet}}` });
    continue;
  }

  let isFlagged = false;
  const flags = [];

  // Check 1b: Placeholder order
  if (srcPlaceholders.join(',') !== tgtPlaceholders.join(',') && srcSet === tgtSet) {
    flags.push({ path, reason: 'placeholder reorder', details: `Source order: ${srcPlaceholders.join(',')} Target order: ${tgtPlaceholders.join(',')}` });
    isFlagged = true;
  }

  // Check 2: Length ratio
  const ratio = tgt.length / src.length;
  const maxRatio = CJK_LOCALES.has(locale) ? 4.0 : 3.0;
  const minRatio = CJK_LOCALES.has(locale) ? 0.15 : 0.25;
  if (ratio > maxRatio || ratio < minRatio) {
    flags.push({ path, reason: 'length ratio', details: `Ratio: ${ratio.toFixed(2)} (threshold: ${minRatio}-${maxRatio})` });
    isFlagged = true;
  }

  // Check 4: Untranslated detection
  const wordCount = src.split(/\s+/).length;
  if (tgt === src && wordCount > 3) {
    flags.push({ path, reason: 'untranslated', details: `Target identical to source (${wordCount} words)` });
    isFlagged = true;
  }

  // Check 5: Glossary compliance
  const srcStripped = stripPlaceholders(src);
  for (const [term, value] of Object.entries(glossary)) {
    if (term === '_meta') continue;
    const termRegex = new RegExp('\\b' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');

    if (value === null) {
      if (termRegex.test(srcStripped) && !new RegExp('\\b' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(tgt)) {
        flags.push({ path, reason: 'glossary never-translate', details: `"${term}" should stay in English` });
        isFlagged = true;
      }
    } else if (typeof value === 'object' && value[locale]) {
      if (termRegex.test(srcStripped) && !stemMatch(tgt, value[locale], locale)) {
        const display = Array.isArray(value[locale]) ? value[locale][0] : value[locale];
        const isInflected = !!LOCALE_CONFIGS[locale];
        flags.push({ path, reason: 'glossary approved translation', severity: isInflected ? 'info' : 'error', details: `"${term}" should be "${display}" in ${locale}` });
        if (!isInflected) isFlagged = true;
      }
    }
  }

  // Check 6: Term consistency
  for (const [term, matches] of Object.entries(termContext)) {
    if (!matches || matches.length === 0) continue;
    const translations = matches.map(m => m[locale]).filter(Boolean);
    if (translations.length === 0) continue;

    const unique = [...new Set(translations)];
    if (unique.length !== 1) continue;

    const established = unique[0];
    const termRegex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (termRegex.test(src) && !tgt.includes(established)) {
      flags.push({ path, reason: 'term consistency', details: `"${term}" is typically "${established}" but not found in translation` });
      isFlagged = true;
    }
  }

  if (isFlagged) {
    flagged.push(...flags);
  } else {
    passed.push(path);
  }
}

console.log(JSON.stringify({ rejected, flagged, passed }, null, 2));
