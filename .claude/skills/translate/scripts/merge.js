const fs = require('fs');

const enKeys = JSON.parse(fs.readFileSync('src/assets/translations/en/main.json', 'utf8'));
const locale = process.argv[2];
const translationsArg = process.argv[3];

let newTranslations;
if (translationsArg && fs.existsSync(translationsArg)) {
  newTranslations = JSON.parse(fs.readFileSync(translationsArg, 'utf8'));
} else {
  newTranslations = JSON.parse(translationsArg);
}

const existing = JSON.parse(fs.readFileSync('src/assets/translations/' + locale + '/main.json', 'utf8'));

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

for (const [path, value] of Object.entries(newTranslations)) {
  setByPath(existing, path, value);
}

const ordered = orderLike(enKeys, existing);
fs.writeFileSync('src/assets/translations/' + locale + '/main.json', JSON.stringify(ordered, null, 2) + '\n');
console.log('Merged ' + Object.keys(newTranslations).length + ' translations into ' + locale);
