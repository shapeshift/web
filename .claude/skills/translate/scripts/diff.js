const { execSync } = require('child_process');
const fs = require('fs');

const sha = fs.readFileSync('src/assets/translations/.last-translation-sha', 'utf8').trim();
const oldContent = execSync('git show ' + sha + ':src/assets/translations/en/main.json', { encoding: 'utf8' });
const oldStrings = JSON.parse(oldContent);
const newStrings = JSON.parse(fs.readFileSync('src/assets/translations/en/main.json', 'utf8'));

function findChanges(prev, curr, path) {
  const results = [];
  for (const key in curr) {
    const currentPath = path ? path + '.' + key : key;
    const currentValue = curr[key];
    const previousValue = prev?.[key];
    if (typeof currentValue === 'string' && previousValue !== currentValue) {
      results.push({ path: currentPath, value: currentValue, status: previousValue ? 'modified' : 'new' });
    } else if (typeof currentValue === 'object' && currentValue !== null) {
      results.push(...findChanges(previousValue || {}, currentValue, currentPath));
    }
  }
  return results;
}

const changes = findChanges(oldStrings, newStrings);
console.log(JSON.stringify(changes, null, 2));
