const { execSync } = require('child_process')

const TEST_LOCALES = ['de', 'es', 'fr', 'ja', 'pt', 'ru', 'tr', 'uk', 'zh']

function main() {
  for (const locale of TEST_LOCALES) {
    const filePath = `src/assets/translations/${locale}/main.json`
    execSync(`git checkout -- ${filePath}`, { encoding: 'utf8' })
    console.log(`Restored ${filePath}`)
  }

  console.log('\nAll locale files restored to their original state.')

  const diff = execSync(
    `git diff --stat -- ${TEST_LOCALES.map(l => `src/assets/translations/${l}/main.json`).join(' ')}`,
    { encoding: 'utf8' },
  ).trim()

  if (diff.length === 0) {
    console.log('Verified: no diff from HEAD.')
  } else {
    console.error('Warning: unexpected diff remains:')
    console.error(diff)
  }
}

main()
