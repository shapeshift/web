const fs = require('fs');

const CJK_LOCALES = new Set(['ja', 'zh']);

function extractPlaceholders(str) {
  return [...str.matchAll(/%\{(\w+)\}/g)].map(m => m[1]);
}

const INFLECTED_LOCALES = new Set(['de', 'es', 'fr', 'pt', 'ru', 'tr', 'uk']);

function stemMatch(target, approved, locale) {
  if (!INFLECTED_LOCALES.has(locale)) {
    return target.toLowerCase().includes(approved.toLowerCase());
  }

  const targetLower = target.toLowerCase();
  const words = approved.split(/\s+/);

  return words.every(word => {
    const minLen = Math.max(3, Math.ceil(word.length * 0.7));
    const stem = word.slice(0, minLen).toLowerCase();
    return targetLower.includes(stem);
  });
}

function loadGlossary(glossaryPath) {
  if (!fs.existsSync(glossaryPath)) return {};
  return JSON.parse(fs.readFileSync(glossaryPath, 'utf8'));
}

function glossaryTerms(glossary) {
  return Object.keys(glossary).filter(k => k !== '_meta');
}

function flattenJson(obj, prefix) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result[path] = value;
    } else if (typeof value === 'object' && value !== null) {
      Object.assign(result, flattenJson(value, path));
    }
  }
  return result;
}

module.exports = {
  CJK_LOCALES,
  INFLECTED_LOCALES,
  extractPlaceholders,
  stemMatch,
  loadGlossary,
  glossaryTerms,
  flattenJson,
};
