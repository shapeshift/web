const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const TRANSLATIONS_DIR = path.resolve(__dirname, '../../../../src/assets/translations')
const BENCHMARK_DIR = path.resolve(__dirname, '../../../../scripts/translations/benchmark')
const TEST_KEYS_PATH = path.join(BENCHMARK_DIR, 'testKeys.json')
const GROUND_TRUTH_PATH = path.join(BENCHMARK_DIR, 'ground-truth.json')
const REPORT_PATH = path.join(BENCHMARK_DIR, 'report.json')
const BASELINE_PATH = path.join(BENCHMARK_DIR, 'baseline.json')

const TEST_LOCALES = ['de', 'es', 'fr', 'ja', 'pt', 'ru', 'tr', 'uk', 'zh']

function getValueByPath(obj, dottedPath) {
  const parts = dottedPath.split('.')
  let current = obj
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined
    current = current[part]
  }
  return typeof current === 'string' ? current : undefined
}

function deletePropertyByPath(obj, dottedPath) {
  const parts = dottedPath.split('.')
  let current = obj
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current.hasOwnProperty(parts[i])) return false
    current = current[parts[i]]
  }
  delete current[parts[parts.length - 1]]
  return true
}

function main() {
  if (!fs.existsSync(TEST_KEYS_PATH)) {
    console.error('Error: testKeys.json not found. Run select-keys.js first.')
    process.exit(1)
  }

  const testKeys = JSON.parse(fs.readFileSync(TEST_KEYS_PATH, 'utf8'))

  const localeFiles = TEST_LOCALES.map(locale => `src/assets/translations/${locale}/main.json`)
  const gitStatus = execSync(`git status --porcelain -- ${localeFiles.join(' ')}`, {
    encoding: 'utf8',
  }).trim()

  if (gitStatus.length > 0) {
    console.error('Error: Git working tree is not clean for locale files:')
    console.error(gitStatus)
    console.error('Please commit or stash changes before running the benchmark setup.')
    process.exit(1)
  }

  if (fs.existsSync(REPORT_PATH)) {
    fs.copyFileSync(REPORT_PATH, BASELINE_PATH)
    console.log('Copied report.json → baseline.json (previous run becomes baseline)')
  }

  const gitSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
  const enData = JSON.parse(fs.readFileSync(path.join(TRANSLATIONS_DIR, 'en/main.json'), 'utf8'))

  const groundTruth = {}
  for (const locale of TEST_LOCALES) groundTruth[locale] = {}
  const english = {}

  for (const { dottedPath } of testKeys) {
    const enValue = getValueByPath(enData, dottedPath)
    if (!enValue) {
      console.error(`Error: English key not found: ${dottedPath}`)
      process.exit(1)
    }
    english[dottedPath] = enValue
  }

  for (const locale of TEST_LOCALES) {
    const localeData = JSON.parse(fs.readFileSync(path.join(TRANSLATIONS_DIR, `${locale}/main.json`), 'utf8'))

    for (const { dottedPath } of testKeys) {
      const value = getValueByPath(localeData, dottedPath)
      if (!value) {
        console.error(`Error: Key not found in ${locale}: ${dottedPath}`)
        process.exit(1)
      }
      groundTruth[locale][dottedPath] = value
    }
  }

  const groundTruthData = {
    generatedAt: new Date().toISOString(),
    gitSha,
    testKeys,
    groundTruth,
    english,
  }
  fs.mkdirSync(BENCHMARK_DIR, { recursive: true })
  fs.writeFileSync(GROUND_TRUTH_PATH, JSON.stringify(groundTruthData, null, 2) + '\n')
  console.log(`Ground truth saved to ${GROUND_TRUTH_PATH}`)
  console.log(`Git SHA: ${gitSha}`)
  console.log(`Test keys: ${testKeys.length}`)

  for (const locale of TEST_LOCALES) {
    const localePath = path.join(TRANSLATIONS_DIR, `${locale}/main.json`)
    const localeData = JSON.parse(fs.readFileSync(localePath, 'utf8'))
    let removedCount = 0

    for (const { dottedPath } of testKeys) {
      const deleted = deletePropertyByPath(localeData, dottedPath)
      if (deleted) removedCount++
    }

    fs.writeFileSync(localePath, JSON.stringify(localeData, null, 2) + '\n')
    console.log(`${locale}: removed ${removedCount}/${testKeys.length} keys`)
  }

  console.log('\nSetup complete. Run /translate to regenerate the removed keys, then run compile-report.js.')
}

main()
