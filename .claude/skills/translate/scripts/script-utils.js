const fs = require('fs');

const CJK_LOCALES = new Set(['ja', 'zh']);
const CYRILLIC_LOCALES = new Set(['ru', 'uk']);
const NON_LATIN_LOCALES = new Set([...CJK_LOCALES, ...CYRILLIC_LOCALES]);

function extractPlaceholders(str) {
  return [...str.matchAll(/%\{(\w+)\}/g)].map(m => m[1]);
}

function stripPlaceholdersAndGlossary(str, glossaryTerms) {
  let cleaned = str.replace(/%\{\w+\}/g, '');
  for (const term of glossaryTerms) {
    cleaned = cleaned.replace(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
  }
  return cleaned.replace(/\s+/g, '');
}

function latinRatio(str, glossaryTerms) {
  const cleaned = stripPlaceholdersAndGlossary(str, glossaryTerms);
  if (cleaned.length === 0) return 0;
  const latinChars = [...cleaned].filter(c => /[a-zA-Z]/.test(c)).length;
  return latinChars / cleaned.length;
}

function cyrillicRatio(str, glossaryTerms) {
  const cleaned = stripPlaceholdersAndGlossary(str, glossaryTerms);
  if (cleaned.length === 0) return 0;
  const cyrillicChars = [...cleaned].filter(c => /[\u0400-\u04FF]/.test(c)).length;
  return cyrillicChars / cleaned.length;
}

function cjkRatio(str, glossaryTerms) {
  const cleaned = stripPlaceholdersAndGlossary(str, glossaryTerms);
  if (cleaned.length === 0) return 0;
  const cjkChars = [...cleaned].filter(c => /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uFF66-\uFF9F]/.test(c)).length;
  return cjkChars / cleaned.length;
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
  CYRILLIC_LOCALES,
  NON_LATIN_LOCALES,
  extractPlaceholders,
  stripPlaceholdersAndGlossary,
  latinRatio,
  cyrillicRatio,
  cjkRatio,
  loadGlossary,
  glossaryTerms,
  flattenJson,
};
