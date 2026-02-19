const fs = require('fs');
const en = JSON.parse(fs.readFileSync('src/assets/translations/en/main.json', 'utf8'));

function findMissing(source, target, path) {
  const results = [];
  for (const key in source) {
    const currentPath = path ? path + '.' + key : key;
    if (typeof source[key] === 'string') {
      if (target?.[key] === undefined) {
        results.push({ path: currentPath, value: source[key], status: 'new' });
      }
    } else if (typeof source[key] === 'object' && source[key] !== null) {
      results.push(...findMissing(source[key], target?.[key] || {}, currentPath));
    }
  }
  return results;
}

const locales = ['de','es','fr','ja','pt','ru','tr','uk','zh'];
const result = {};
for (const locale of locales) {
  const target = JSON.parse(fs.readFileSync('src/assets/translations/' + locale + '/main.json', 'utf8'));
  const missing = findMissing(en, target);
  if (missing.length > 0) result[locale] = missing;
}
console.log(JSON.stringify(result, null, 2));
