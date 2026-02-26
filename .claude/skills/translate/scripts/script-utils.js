const fs = require('fs');

const CJK_LOCALES = new Set(['ja', 'zh']);

function extractPlaceholders(str) {
  return [...str.matchAll(/%\{(\w+)\}/g)].map(m => m[1]);
}

function stripPlaceholders(str) {
  return str.replace(/%\{\w+\}/g, '');
}

function toLower(str, locale) {
  return locale === 'tr' ? str.toLocaleLowerCase('tr') : str.toLowerCase();
}

const LOCALE_CONFIGS = {
  de: {
    stemRatio: 0.75,
    suffixes: [
      'ungen', 'keit', 'lich', 'isch', 'ung', 'ten', 'tet', 'en', 'er', 'es', 'em', 'te', 'st', 'e',
    ],
  },
  es: {
    stemRatio: 0.65,
    suffixes: [
      'iendo', 'ando', 'ción', 'ado', 'ido', 'mos', 'ar', 'er', 'ir', 'an', 'en', 'as', 'es', 'os',
    ],
  },
  fr: {
    stemRatio: 0.65,
    suffixes: [
      'tion', 'ment', 'ons', 'ant', 'ent', 'ais', 'ait', 'eur', 'ée', 'és', 'ez', 'er', 'ir', 're',
    ],
  },
  pt: {
    stemRatio: 0.65,
    suffixes: [
      'mente', 'ando', 'ção', 'ado', 'ido', 'mos', 'ar', 'er', 'ir', 'am', 'em', 'as', 'es',
    ],
  },
  ru: {
    stemRatio: 0.55,
    suffixes: [
      'ения', 'ение', 'ами', 'ать', 'ять', 'ишь', 'ала', 'али', 'ите', 'ют', 'ут', 'ят', 'ть', 'ти',
      'ит', 'ов', 'ам', 'ах', 'ом', 'ой', 'ен', 'на', 'ы', 'а', 'у', 'е', 'и',
    ],
  },
  tr: {
    stemRatio: 0.60,
    suffixes: [
      'sınız', 'siniz', 'abilir', 'ebilir', 'ıyor', 'iyor', 'mak', 'mek', 'lar', 'ler', 'lık', 'lik',
      'ın', 'in', 'da', 'de', 'ta', 'te', 'dı', 'di', 'ı', 'i', 'u', 'ü',
    ],
  },
  uk: {
    stemRatio: 0.55,
    suffixes: [
      'ення', 'ання', 'ами', 'ати', 'яти', 'іть', 'ає', 'ює', 'ала', 'али', 'іте', 'айте',
      'ть', 'ти', 'ав', 'ів', 'ам', 'ах', 'ом', 'ою', 'а', 'у', 'і', 'и',
    ],
  },
};

function stripSuffix(word, suffixes) {
  for (const suffix of suffixes) {
    if (word.endsWith(suffix)) {
      const root = word.slice(0, -suffix.length);
      if (root.length >= 3) return root;
    }
  }
  return null;
}

function stemMatch(target, approved, locale) {
  const config = LOCALE_CONFIGS[locale];

  if (!config) {
    const forms = Array.isArray(approved) ? approved : [approved];
    return forms.some(form => target.toLowerCase().includes(form.toLowerCase()));
  }

  const targetLower = toLower(target, locale);
  const forms = Array.isArray(approved) ? approved : [approved];

  return forms.some(form => {
    const words = form.split(/\s+/);
    return words.every(word => {
      const wordLower = toLower(word, locale);

      // Tier 1: Exact substring
      if (targetLower.includes(wordLower)) return true;

      // Tier 2: Stem prefix
      const minLen = Math.max(3, Math.ceil(wordLower.length * config.stemRatio));
      const stem = wordLower.slice(0, minLen);
      if (targetLower.includes(stem)) return true;

      // Tier 3: Suffix-stripped root
      const root = stripSuffix(wordLower, config.suffixes);
      if (root && targetLower.includes(root)) return true;

      return false;
    });
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
  LOCALE_CONFIGS,
  extractPlaceholders,
  stripPlaceholders,
  toLower,
  stemMatch,
  loadGlossary,
  glossaryTerms,
  flattenJson,
};
