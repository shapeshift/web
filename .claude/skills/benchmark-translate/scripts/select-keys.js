const fs = require('fs')
const path = require('path')

const TRANSLATIONS_DIR = path.resolve(__dirname, '../../../../src/assets/translations')
const BENCHMARK_DIR = path.resolve(__dirname, '../../../../scripts/translations/benchmark')
const OUTPUT_PATH = path.join(BENCHMARK_DIR, 'testKeys.json')
const CORE_KEYS_PATH = path.join(BENCHMARK_DIR, 'coreKeys.json')

const TEST_LOCALES = ['de', 'es', 'fr', 'ja', 'pt', 'ru', 'tr', 'uk', 'zh']

function flatten(obj, prefix) {
  prefix = prefix || ''
  const entries = []
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') {
      entries.push({ dottedPath: fullPath, value })
    } else if (typeof value === 'object' && value !== null) {
      entries.push(...flatten(value, fullPath))
    }
  }
  return entries
}

function getValueByPath(obj, dottedPath) {
  const parts = dottedPath.split('.')
  let current = obj
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined
    current = current[part]
  }
  return typeof current === 'string' ? current : undefined
}

function categorize(dottedPath, value) {
  const lower = value.toLowerCase()
  const pathLower = dottedPath.toLowerCase()

  if (
    lower.includes('dust') ||
    lower.includes('impermanent loss') ||
    lower.includes('claim') ||
    lower.includes('trade')
  ) {
    return 'glossary-term'
  }

  if (
    pathLower.includes('.errors.') ||
    pathLower.includes('.error.') ||
    lower.includes('fee') ||
    lower.includes('collateral') ||
    lower.includes('deposit') ||
    lower.includes('withdraw') ||
    lower.includes('insufficient')
  ) {
    return 'financial-error'
  }

  const wordCount = value.trim().split(/\s+/).length
  if (wordCount <= 3 && !value.includes('%{')) {
    return 'single-word'
  }

  if (value.includes('%{')) {
    return 'interpolation'
  }

  const defiPrefixes = ['defi.', 'trade.', 'lending.', 'earn.', 'pools.']
  if (defiPrefixes.some(p => pathLower.startsWith(p))) {
    return 'defi-jargon'
  }

  return 'general'
}

function shuffleArray(arr) {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function stratifiedSelect(pool, candidates, count, selectedPaths) {
  const pools = {
    'glossary-term': [],
    'financial-error': [],
    'single-word': [],
    'interpolation': [],
    'defi-jargon': [],
    'general': [],
  }

  for (const entry of candidates) {
    if (selectedPaths.has(entry.dottedPath)) continue
    if (!pool.has(entry.dottedPath)) continue
    const category = categorize(entry.dottedPath, entry.value)
    if (pools[category]) pools[category].push(entry)
  }

  const quotas = {
    'glossary-term': Math.round(18 * count / 75),
    'financial-error': Math.round(12 * count / 75),
    'single-word': Math.round(12 * count / 75),
    'interpolation': Math.round(12 * count / 75),
    'defi-jargon': Math.round(8 * count / 75),
  }

  const selected = []
  const usedPaths = new Set()

  function selectFrom(entries, category, target) {
    const shuffled = shuffleArray(entries)
    for (const entry of shuffled) {
      if (usedPaths.has(entry.dottedPath)) continue
      selected.push({ dottedPath: entry.dottedPath, category })
      usedPaths.add(entry.dottedPath)
      if (selected.filter(s => s.category === category).length >= target) break
    }
  }

  selectFrom(pools['glossary-term'], 'glossary-term', quotas['glossary-term'])
  selectFrom(pools['financial-error'], 'financial-error', quotas['financial-error'])
  selectFrom(pools['single-word'], 'single-word', quotas['single-word'])
  selectFrom(pools['interpolation'], 'interpolation', quotas['interpolation'])
  selectFrom(pools['defi-jargon'], 'defi-jargon', quotas['defi-jargon'])

  const remaining = count - selected.length
  selectFrom(pools['general'], 'general', remaining)

  if (selected.length < count) {
    const allRemaining = candidates.filter(
      e => pool.has(e.dottedPath) && !usedPaths.has(e.dottedPath) && !selectedPaths.has(e.dottedPath),
    )
    const shuffled = shuffleArray(allRemaining)
    for (const entry of shuffled) {
      if (selected.length >= count) break
      selected.push({ dottedPath: entry.dottedPath, category: 'general' })
      usedPaths.add(entry.dottedPath)
    }
  }

  return selected
}

function main() {
  const countArg = process.argv.indexOf('--count')
  const totalTarget = countArg !== -1 ? parseInt(process.argv[countArg + 1], 10) : 150

  const coreArg = process.argv.indexOf('--core')
  const coreTarget = coreArg !== -1 ? parseInt(process.argv[coreArg + 1], 10) : 100

  if (isNaN(totalTarget) || totalTarget < 1) {
    console.error('Error: --count must be a positive integer')
    process.exit(1)
  }
  if (isNaN(coreTarget) || coreTarget < 1) {
    console.error('Error: --core must be a positive integer')
    process.exit(1)
  }
  if (coreTarget >= totalTarget) {
    console.error(`Error: --core (${coreTarget}) must be less than --count (${totalTarget})`)
    process.exit(1)
  }

  const enData = JSON.parse(fs.readFileSync(path.join(TRANSLATIONS_DIR, 'en/main.json'), 'utf8'))
  const allFlat = flatten(enData)
  console.log(`Total English strings: ${allFlat.length}`)

  const localeData = {}
  for (const locale of TEST_LOCALES) {
    localeData[locale] = JSON.parse(fs.readFileSync(path.join(TRANSLATIONS_DIR, `${locale}/main.json`), 'utf8'))
  }

  const candidates = allFlat.filter(entry => {
    return TEST_LOCALES.every(locale => {
      const val = getValueByPath(localeData[locale], entry.dottedPath)
      return val !== undefined && val.trim().length > 0
    })
  })
  console.log(`Candidates (exist in all ${TEST_LOCALES.length} locales): ${candidates.length}`)
  const candidatePathSet = new Set(candidates.map(e => e.dottedPath))

  let coreKeys = []
  let coreCreated = false

  if (fs.existsSync(CORE_KEYS_PATH)) {
    const loaded = JSON.parse(fs.readFileSync(CORE_KEYS_PATH, 'utf8'))
    const validated = loaded.filter(entry => candidatePathSet.has(entry.dottedPath))
    const staleCount = loaded.length - validated.length
    if (staleCount > 0) {
      console.log(`Core keys: removed ${staleCount} stale keys (no longer in all locales)`)
    }
    coreKeys = validated
    console.log(`Core keys loaded: ${coreKeys.length}/${loaded.length} valid`)
  }

  const corePathSet = new Set(coreKeys.map(e => e.dottedPath))

  if (coreKeys.length < coreTarget) {
    const needed = coreTarget - coreKeys.length
    console.log(`Core keys: selecting ${needed} additional keys to reach target of ${coreTarget}`)
    const topUp = stratifiedSelect(
      new Set(candidates.filter(e => !corePathSet.has(e.dottedPath)).map(e => e.dottedPath)),
      candidates,
      needed,
      corePathSet,
    )
    coreKeys = [...coreKeys, ...topUp]
    coreCreated = true
  }

  if (!fs.existsSync(CORE_KEYS_PATH) || coreCreated) {
    fs.mkdirSync(path.dirname(CORE_KEYS_PATH), { recursive: true })
    fs.writeFileSync(CORE_KEYS_PATH, JSON.stringify(coreKeys, null, 2) + '\n')
    console.log(`Core keys saved to ${CORE_KEYS_PATH} (${coreKeys.length} keys)`)
  }

  const allCorePathSet = new Set(coreKeys.map(e => e.dottedPath))
  const rotatingCount = totalTarget - coreKeys.length
  console.log(`\nSelecting ${rotatingCount} rotating keys...`)

  const rotatingPool = new Set(
    candidates.filter(e => !allCorePathSet.has(e.dottedPath)).map(e => e.dottedPath),
  )
  const rotatingKeys = stratifiedSelect(rotatingPool, candidates, rotatingCount, allCorePathSet)

  const selected = [
    ...coreKeys.map(e => ({ ...e, fixed: true })),
    ...rotatingKeys.map(e => ({ ...e, fixed: false })),
  ]

  console.log(`\nSelected ${selected.length} keys (${coreKeys.length} fixed + ${rotatingKeys.length} rotating)`)

  const categoryCounts = {}
  for (const entry of selected) {
    categoryCounts[entry.category] = (categoryCounts[entry.category] || 0) + 1
  }
  console.log('\nCategory distribution:')
  for (const [cat, count] of Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`)
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(selected, null, 2) + '\n')
  console.log(`\nWrote ${OUTPUT_PATH}`)
}

main()
