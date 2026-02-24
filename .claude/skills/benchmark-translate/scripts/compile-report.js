const fs = require('fs')
const path = require('path')

const TRANSLATIONS_DIR = path.resolve(__dirname, '../../../../src/assets/translations')
const BENCHMARK_DIR = path.resolve(__dirname, '../../../../scripts/translations/benchmark')
const GT_PATH = path.join(BENCHMARK_DIR, 'ground-truth.json')
const REPORT_PATH = path.join(BENCHMARK_DIR, 'report.json')
const BASELINE_PATH = path.join(BENCHMARK_DIR, 'baseline.json')
const GLOSSARY_PATH = path.join(TRANSLATIONS_DIR, 'glossary.json')

const TEST_LOCALES = ['de', 'es', 'fr', 'ja', 'pt', 'ru', 'tr', 'uk', 'zh']
const CJK_LOCALES = ['ja', 'zh']
const CYRILLIC_LOCALES = ['ru', 'uk']

const LOCALE_INFO = {
  de: { name: 'German', register: 'Formal (Sie)' },
  es: { name: 'Spanish', register: 'Informal (tú)' },
  fr: { name: 'French', register: 'Formal (vous)' },
  ja: { name: 'Japanese', register: 'Polite (です/ます)' },
  pt: { name: 'Portuguese', register: 'Informal (você)' },
  ru: { name: 'Russian', register: 'Formal (вы)' },
  tr: { name: 'Turkish', register: 'Formal (siz)' },
  uk: { name: 'Ukrainian', register: 'Formal (ви)' },
  zh: { name: 'Chinese (Simplified)', register: 'Neutral/formal' },
}

const GLOSSARY_TARGET_TERMS = [
  { englishPattern: 'dust', glossaryKey: 'dust', isNeverTranslate: true },
  { englishPattern: 'claim', glossaryKey: 'claim', isNeverTranslate: false },
  { englishPattern: 'trade', glossaryKey: 'trade', isNeverTranslate: false },
  { englishPattern: 'impermanent loss', glossaryKey: 'impermanent loss', isNeverTranslate: false },
  { englishPattern: 'approve', glossaryKey: 'approve', isNeverTranslate: false },
  { englishPattern: 'seed phrase', glossaryKey: 'seed phrase', isNeverTranslate: false },
  { englishPattern: 'deposit', glossaryKey: 'deposit', isNeverTranslate: false },
  { englishPattern: 'staking', glossaryKey: 'staking', isNeverTranslate: false },
  { englishPattern: 'swap', glossaryKey: 'swap', isNeverTranslate: false },
  { englishPattern: 'wallet', glossaryKey: 'wallet', isNeverTranslate: false },
  { englishPattern: 'insufficient funds', glossaryKey: 'insufficient funds', isNeverTranslate: false },
]

function getVal(obj, p) {
  return p.split('.').reduce((o, k) => o && o[k], obj)
}

function extractPh(s) {
  return [...s.matchAll(/%\{(\w+)\}/g)].map(m => m[1]).sort()
}

function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

if (!fs.existsSync(GT_PATH)) {
  console.error('Error: ground-truth.json not found. Run setup.js first.')
  process.exit(1)
}

const gt = JSON.parse(fs.readFileSync(GT_PATH, 'utf8'))
const glossary = JSON.parse(fs.readFileSync(GLOSSARY_PATH, 'utf8'))

const neverTranslateTerms = Object.entries(glossary)
  .filter(([k, v]) => k !== '_meta' && v === null)
  .map(([k]) => k)

const approvedByLocale = {}
for (const [key, value] of Object.entries(glossary)) {
  if (key === '_meta' || value === null || typeof value !== 'object') continue
  for (const locale of TEST_LOCALES) {
    if (!approvedByLocale[locale]) approvedByLocale[locale] = []
    if (value[locale]) approvedByLocale[locale].push({ term: key, approved: value[locale] })
  }
}

const judgeScores = {}
let hasJudgeScores = true
for (const locale of TEST_LOCALES) {
  const scorePath = `/tmp/${locale}-judge-scores.json`
  if (!fs.existsSync(scorePath)) {
    console.error(`Warning: ${scorePath} not found — skipping judge scores for ${locale}`)
    hasJudgeScores = false
    judgeScores[locale] = new Map()
    continue
  }
  const scores = JSON.parse(fs.readFileSync(scorePath, 'utf8'))
  judgeScores[locale] = new Map()
  for (const s of scores) {
    judgeScores[locale].set(s.key, s)
  }
}

function checkGlossaryCorrectness(english, skill, locale) {
  const englishLower = english.toLowerCase()
  const matched = []
  for (const term of GLOSSARY_TARGET_TERMS) {
    if (!englishLower.includes(term.englishPattern)) continue
    if (term.isNeverTranslate) {
      const has = skill.toLowerCase().includes(term.englishPattern)
      matched.push({ passed: has, reason: has ? `"${term.englishPattern}" kept` : `"${term.englishPattern}" missing` })
    } else {
      const entry = glossary[term.glossaryKey]
      if (entry && typeof entry === 'object' && entry[locale]) {
        const has = skill.toLowerCase().includes(entry[locale].toLowerCase())
        matched.push({ passed: has, reason: has ? `"${term.englishPattern}" → "${entry[locale]}"` : `"${term.englishPattern}" should be "${entry[locale]}"` })
      }
    }
  }
  if (matched.length === 0) return { correct: null, detail: null }
  return { correct: matched.every(m => m.passed), detail: matched.map(m => m.reason).join('; ') }
}

function validate(english, skill, locale) {
  const isCjk = CJK_LOCALES.includes(locale)
  const isCyrillic = CYRILLIC_LOCALES.includes(locale)
  const isEmpty = skill.trim().length === 0
  const words = english.trim().split(/\s+/).length
  const isUntranslated = skill === english && words > 3
  const srcPh = extractPh(english)
  const tgtPh = extractPh(skill)
  const placeholderIntegrity = srcPh.length === tgtPh.length && srcPh.every((p, i) => p === tgtPh[i])
  const ratio = english.length > 0 ? skill.length / english.length : 1
  const lengthRatioOk = ratio <= (isCjk ? 4.0 : 3.0) && ratio >= (isCjk ? 0.15 : 0.25)

  const glossaryViolations = []
  for (const term of neverTranslateTerms) {
    if (english.toLowerCase().includes(term.toLowerCase()) && !skill.toLowerCase().includes(term.toLowerCase())) {
      glossaryViolations.push(`"${term}" should stay in English`)
    }
  }
  for (const { term, approved } of (approvedByLocale[locale] || [])) {
    const tl = term.toLowerCase()
    if (english.toLowerCase().includes(tl) && !skill.toLowerCase().includes(approved.toLowerCase())) {
      glossaryViolations.push(`"${term}" should be "${approved}"`)
    }
  }

  const { correct: glossaryCorrectness, detail: glossaryCorrectnessDetail } = checkGlossaryCorrectness(english, skill, locale)

  let scriptCorrect = true
  if ((isCjk || isCyrillic) && !isEmpty && !isUntranslated) {
    let stripped = skill.replace(/%\{\w+\}/g, '')
    stripped = neverTranslateTerms.reduce((s, t) => s.replace(new RegExp(escRe(t), 'g'), ''), stripped)
    const nw = stripped.replace(/\s/g, '')
    if (nw.length > 0) {
      const latin = nw.replace(/[^a-zA-Z]/g, '').length
      scriptCorrect = latin / nw.length <= 0.7
    }
  }

  return {
    placeholderIntegrity, lengthRatioOk, lengthRatio: Math.round(ratio * 100) / 100,
    glossaryCompliance: glossaryViolations.length === 0, glossaryViolations,
    glossaryCorrectness, glossaryCorrectnessDetail,
    scriptCorrect, isEmpty, isUntranslated,
  }
}

const results = []
for (const locale of TEST_LOCALES) {
  const localeData = JSON.parse(fs.readFileSync(path.join(TRANSLATIONS_DIR, `${locale}/main.json`), 'utf8'))
  for (const tk of gt.testKeys) {
    const english = gt.english[tk.dottedPath]
    const human = gt.groundTruth[locale][tk.dottedPath]
    const skill = getVal(localeData, tk.dottedPath) || ''
    const exactMatch = skill === human
    const validation = validate(english, skill, locale)
    const js = judgeScores[locale].get(tk.dottedPath)
    const judgeScore = js ? {
      humanScore: js.humanScore, skillScore: js.skillScore,
      humanJustification: js.humanJustification, skillJustification: js.skillJustification,
      preferenceNote: js.preferenceNote,
    } : null
    results.push({ dottedPath: tk.dottedPath, category: tk.category, fixed: tk.fixed, locale, english, humanTranslation: human, skillTranslation: skill, exactMatch, validation, judgeScore })
  }
}

function computeStats(subset) {
  const total = subset.length
  const exactMatchCount = subset.filter(r => r.exactMatch).length
  const validPass = subset.filter(r =>
    r.validation.placeholderIntegrity && r.validation.lengthRatioOk &&
    r.validation.glossaryCompliance && r.validation.scriptCorrect &&
    !r.validation.isEmpty && !r.validation.isUntranslated
  ).length
  const judged = subset.filter(r => r.judgeScore)
  const avgHuman = judged.length > 0 ? judged.reduce((s, r) => s + r.judgeScore.humanScore, 0) / judged.length : null
  const avgSkill = judged.length > 0 ? judged.reduce((s, r) => s + r.judgeScore.skillScore, 0) / judged.length : null
  const humanWins = judged.filter(r => r.judgeScore.humanScore > r.judgeScore.skillScore).length
  const skillWins = judged.filter(r => r.judgeScore.skillScore > r.judgeScore.humanScore).length
  const ties = judged.filter(r => r.judgeScore.humanScore === r.judgeScore.skillScore).length
  const lowScores = judged.filter(r => r.judgeScore.skillScore <= 3).length
  return { total, exactMatchCount, validPass, judged, avgHuman, avgSkill, humanWins, skillWins, ties, lowScores }
}

const overall = computeStats(results)
const coreResults = results.filter(r => r.fixed === true)
const rotatingResults = results.filter(r => r.fixed === false)
const coreStats = computeStats(coreResults)
const rotatingStats = computeStats(rotatingResults)

const gcResults = results.filter(r => r.validation.glossaryCorrectness !== null)
const gcPass = gcResults.filter(r => r.validation.glossaryCorrectness === true).length

const baseline = fs.existsSync(BASELINE_PATH)
  ? JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'))
  : null

console.log('\n=== Translation Benchmark Report ===\n')
console.log(`Ground truth SHA: ${gt.gitSha}`)
console.log(`Total comparisons: ${overall.total} (${gt.testKeys.length} keys × ${TEST_LOCALES.length} locales)\n`)

console.log('--- Overall Summary ---')
console.log(`Exact match rate: ${overall.exactMatchCount}/${overall.total} (${((overall.exactMatchCount / overall.total) * 100).toFixed(1)}%)`)
console.log(`Validation pass rate: ${overall.validPass}/${overall.total} (${((overall.validPass / overall.total) * 100).toFixed(1)}%)`)
if (overall.avgHuman !== null && overall.avgSkill !== null) {
  console.log(`Avg human score: ${overall.avgHuman.toFixed(2)}/5`)
  console.log(`Avg skill score: ${overall.avgSkill.toFixed(2)}/5`)
  console.log(`Human wins: ${overall.humanWins} | Skill wins: ${overall.skillWins} | Ties: ${overall.ties}`)
  console.log(`Low skill scores (≤3): ${overall.lowScores}`)
}

const coreKeyCount = gt.testKeys.filter(k => k.fixed === true).length
const rotatingKeyCount = gt.testKeys.filter(k => k.fixed === false).length
console.log('\n--- Core vs Rotating ---')
const coreLine = coreStats.avgSkill !== null
  ? `Core (${coreKeyCount} fixed keys):     skill ${coreStats.avgSkill.toFixed(2)}  valid ${((coreStats.validPass / coreStats.total) * 100).toFixed(1)}%`
  : `Core (${coreKeyCount} fixed keys):     valid ${((coreStats.validPass / coreStats.total) * 100).toFixed(1)}%`
const rotatingLine = rotatingStats.avgSkill !== null
  ? `Rotating (${rotatingKeyCount} keys):       skill ${rotatingStats.avgSkill.toFixed(2)}  valid ${((rotatingStats.validPass / rotatingStats.total) * 100).toFixed(1)}%`
  : `Rotating (${rotatingKeyCount} keys):       valid ${((rotatingStats.validPass / rotatingStats.total) * 100).toFixed(1)}%`
console.log(`  ${coreLine}`)
console.log(`  ${rotatingLine}`)

console.log('\n--- By Category ---')
const cats = ['glossary-term', 'financial-error', 'single-word', 'interpolation', 'defi-jargon', 'general']
for (const cat of cats) {
  const cr = results.filter(r => r.category === cat)
  if (cr.length === 0) continue
  const cj = cr.filter(r => r.judgeScore)
  const ch = cj.length > 0 ? cj.reduce((s, r) => s + r.judgeScore.humanScore, 0) / cj.length : null
  const cs = cj.length > 0 ? cj.reduce((s, r) => s + r.judgeScore.skillScore, 0) / cj.length : null
  const cv = cr.filter(r => r.validation.placeholderIntegrity && r.validation.lengthRatioOk && !r.validation.isEmpty && !r.validation.isUntranslated).length
  const scoreStr = ch !== null && cs !== null ? ` | human: ${ch.toFixed(2)} skill: ${cs.toFixed(2)}` : ''
  console.log(`  ${cat.padEnd(20)} n=${cr.length.toString().padEnd(3)} valid: ${cv}/${cr.length}${scoreStr}`)
}

console.log('\n--- By Locale ---')
for (const locale of TEST_LOCALES) {
  const lr = results.filter(r => r.locale === locale)
  const lj = lr.filter(r => r.judgeScore)
  const lh = lj.length > 0 ? lj.reduce((s, r) => s + r.judgeScore.humanScore, 0) / lj.length : null
  const ls = lj.length > 0 ? lj.reduce((s, r) => s + r.judgeScore.skillScore, 0) / lj.length : null
  const lv = lr.filter(r => r.validation.placeholderIntegrity && r.validation.lengthRatioOk && !r.validation.isEmpty && !r.validation.isUntranslated).length
  const sw = lj.filter(r => r.judgeScore.skillScore > r.judgeScore.humanScore).length
  const hw = lj.filter(r => r.judgeScore.humanScore > r.judgeScore.skillScore).length
  const ti = lj.filter(r => r.judgeScore.humanScore === r.judgeScore.skillScore).length
  const scoreStr = lh !== null && ls !== null ? ` | human: ${lh.toFixed(2)} skill: ${ls.toFixed(2)} | wins: skill ${sw} human ${hw} tie ${ti}` : ''
  console.log(`  ${locale}  valid: ${lv}/${lr.length}${scoreStr}`)
}

if (overall.judged.length > 0) {
  console.log('\n--- Score Difference Distribution (skill - human) ---')
  const diffs = overall.judged.map(r => r.judgeScore.skillScore - r.judgeScore.humanScore)
  const mean = diffs.reduce((s, d) => s + d, 0) / diffs.length
  const variance = diffs.reduce((s, d) => s + (d - mean) ** 2, 0) / diffs.length
  const stddev = Math.sqrt(variance)
  const buckets = { '≤-3': 0, '-2': 0, '-1': 0, '0': 0, '+1': 0, '+2': 0, '≥+3': 0 }
  for (const d of diffs) {
    if (d <= -3) buckets['≤-3']++
    else if (d === -2) buckets['-2']++
    else if (d === -1) buckets['-1']++
    else if (d === 0) buckets['0']++
    else if (d === 1) buckets['+1']++
    else if (d === 2) buckets['+2']++
    else buckets['≥+3']++
  }
  const maxBucket = Math.max(...Object.values(buckets))
  const barScale = maxBucket > 0 ? 40 / maxBucket : 1
  for (const [label, count] of Object.entries(buckets)) {
    const bar = '█'.repeat(Math.round(count * barScale))
    console.log(`  ${label.padStart(3)}  ${bar} ${count}`)
  }
  console.log(`  Mean: ${mean >= 0 ? '+' : ''}${mean.toFixed(2)}  Stddev: ${stddev.toFixed(2)}`)
}

console.log('\n--- UI Length Expansion Risk (>150% of English) ---')
const expansionThreshold = 1.5
const expanded = results.filter(r => {
  if (r.validation.isEmpty || r.validation.isUntranslated) return false
  return r.english.length > 0 && r.skillTranslation.length / r.english.length > expansionThreshold
})
const expansionByLocale = {}
for (const locale of TEST_LOCALES) {
  const localeExpanded = expanded.filter(r => r.locale === locale)
  expansionByLocale[locale] = localeExpanded
  if (localeExpanded.length > 0) {
    console.log(`  ${locale}: ${localeExpanded.length} strings over 150%`)
  }
}
if (expanded.length > 0) {
  const sorted = expanded.toSorted((a, b) => (b.skillTranslation.length / b.english.length) - (a.skillTranslation.length / a.english.length))
  console.log(`  Total: ${expanded.length} strings`)
  console.log(`  Worst 10:`)
  for (const r of sorted.slice(0, 10)) {
    const ratio = Math.round((r.skillTranslation.length / r.english.length) * 100)
    console.log(`    ${r.locale}:${r.dottedPath} (${ratio}%) EN[${r.english.length}ch] → ${r.locale.toUpperCase()}[${r.skillTranslation.length}ch]`)
  }
} else {
  console.log('  None found.')
}

console.log('\n--- Glossary Term Correctness ---')
for (const tt of GLOSSARY_TARGET_TERMS) {
  const tr = results.filter(r => r.english.toLowerCase().includes(tt.englishPattern))
  const checked = tr.filter(r => r.validation.glossaryCorrectness !== null)
  const correct = checked.filter(r => r.validation.glossaryCorrectness === true).length
  console.log(`  "${tt.englishPattern}": ${correct}/${checked.length} correct (${checked.length > 0 ? ((correct / checked.length) * 100).toFixed(0) : 'N/A'}%)`)
  for (const locale of TEST_LOCALES) {
    const lc = checked.filter(r => r.locale === locale)
    const lcOk = lc.filter(r => r.validation.glossaryCorrectness === true).length
    if (lc.length > 0) console.log(`    ${locale}: ${lcOk}/${lc.length}`)
  }
}

console.log('\n--- Validation Details ---')
const phFail = results.filter(r => !r.validation.placeholderIntegrity)
const lenFail = results.filter(r => !r.validation.lengthRatioOk)
const glosFail = results.filter(r => !r.validation.glossaryCompliance)
const scrFail = results.filter(r => !r.validation.scriptCorrect)
const empFail = results.filter(r => r.validation.isEmpty)
const untFail = results.filter(r => r.validation.isUntranslated)
console.log(`  Placeholder failures: ${phFail.length}`)
console.log(`  Length ratio OOB: ${lenFail.length}`)
console.log(`  Glossary violations: ${glosFail.length}`)
console.log(`  Wrong script: ${scrFail.length}`)
console.log(`  Empty: ${empFail.length}`)
console.log(`  Untranslated: ${untFail.length}`)

if (phFail.length > 0) {
  console.log('\n  Placeholder failures:')
  for (const r of phFail) {
    console.log(`    ${r.locale}:${r.dottedPath}`)
    console.log(`      EN: ${r.english}`)
    console.log(`      Skill: ${r.skillTranslation}`)
  }
}

if (glosFail.length > 0) {
  console.log('\n  Glossary violations:')
  for (const r of glosFail) {
    console.log(`    ${r.locale}:${r.dottedPath} — ${r.validation.glossaryViolations.join('; ')}`)
  }
}

if (overall.judged.length > 0) {
  console.log('\n--- Notable Results ---')
  const skillBigWins = overall.judged.filter(r => r.judgeScore.skillScore - r.judgeScore.humanScore >= 2)
  const humanBigWins = overall.judged.filter(r => r.judgeScore.humanScore - r.judgeScore.skillScore >= 2)

  if (skillBigWins.length > 0) {
    console.log(`\n  Skill significantly better (≥2 pts, ${skillBigWins.length} cases):`)
    for (const r of skillBigWins) {
      console.log(`    ${r.locale}:${r.dottedPath} (human: ${r.judgeScore.humanScore} skill: ${r.judgeScore.skillScore})`)
      console.log(`      ${r.judgeScore.preferenceNote}`)
    }
  }

  if (humanBigWins.length > 0) {
    console.log(`\n  Human significantly better (≥2 pts, ${humanBigWins.length} cases):`)
    for (const r of humanBigWins) {
      console.log(`    ${r.locale}:${r.dottedPath} (human: ${r.judgeScore.humanScore} skill: ${r.judgeScore.skillScore})`)
      console.log(`      ${r.judgeScore.preferenceNote}`)
    }
  }
}

if (baseline && baseline.summary) {
  const bs = baseline.summary
  console.log('\n--- Regression vs Baseline ---')
  console.log(`  Comparisons: ${bs.totalComparisons} → ${overall.total}`)

  const r3vpr = Math.round((overall.validPass / overall.total) * 1000) / 10
  const r3as = overall.avgSkill !== null ? Math.round(overall.avgSkill * 100) / 100 : null
  const r3ah = overall.avgHuman !== null ? Math.round(overall.avgHuman * 100) / 100 : null

  if (r3as !== null && bs.avgSkillScore !== null) {
    console.log(`  Avg skill score: ${bs.avgSkillScore} → ${r3as} (${r3as >= bs.avgSkillScore ? '+' : ''}${(r3as - bs.avgSkillScore).toFixed(2)})`)
  }
  if (r3ah !== null && bs.avgHumanScore !== null) {
    console.log(`  Avg human score: ${bs.avgHumanScore} → ${r3ah} (${r3ah >= bs.avgHumanScore ? '+' : ''}${(r3ah - bs.avgHumanScore).toFixed(2)})`)
  }
  if (bs.skillWins !== null && bs.totalComparisons > 0) {
    const bsSwr = Math.round((bs.skillWins / bs.totalComparisons) * 1000) / 10
    const r3swr = overall.total > 0 ? Math.round((overall.skillWins / overall.total) * 1000) / 10 : null
    if (r3swr !== null) {
      console.log(`  Skill win rate: ${bsSwr}% → ${r3swr}% (${r3swr >= bsSwr ? '+' : ''}${(r3swr - bsSwr).toFixed(1)}pp)`)
    }
  }
  if (bs.lowScoreCount !== null) {
    console.log(`  Low scores (≤3): ${bs.lowScoreCount} → ${overall.lowScores}`)
  }
  if (bs.validationPassRate !== null) {
    console.log(`  Validation pass rate: ${bs.validationPassRate}% → ${r3vpr}%`)
  }
  const bsGlosViolations = baseline.results
    ? baseline.results.filter(r => !r.validation.glossaryCompliance).length
    : null
  if (bsGlosViolations !== null) {
    console.log(`  Glossary violations: ${bsGlosViolations} → ${glosFail.length}`)
  }

  if (baseline.coreSummary && coreStats.avgSkill !== null) {
    const bcs = baseline.coreSummary
    console.log('\n  Core regression:')
    if (bcs.avgSkillScore !== null) {
      const coreSkill = Math.round(coreStats.avgSkill * 100) / 100
      console.log(`    Avg skill score: ${bcs.avgSkillScore} → ${coreSkill} (${coreSkill >= bcs.avgSkillScore ? '+' : ''}${(coreSkill - bcs.avgSkillScore).toFixed(2)})`)
    }
    if (bcs.validationPassRate !== null) {
      const coreVpr = Math.round((coreStats.validPass / coreStats.total) * 1000) / 10
      console.log(`    Validation pass rate: ${bcs.validationPassRate}% → ${coreVpr}%`)
    }
  }

  if (baseline.results && baseline.results.length > 0) {
    const baselineLocales = new Set(baseline.results.map(r => r.locale))
    const currentLocales = new Set(results.map(r => r.locale))
    const overlapping = TEST_LOCALES.filter(l => baselineLocales.has(l) && currentLocales.has(l))

    if (overlapping.length < TEST_LOCALES.length || overlapping.length < baselineLocales.size) {
      console.log(`\n  Apples-to-apples (${overlapping.length} overlapping locales: ${overlapping.join(', ')}):`)
      const bCoreKeys = new Set(baseline.results.filter(r => r.fixed === true).map(r => r.dottedPath))
      const cCoreKeys = new Set(coreResults.map(r => r.dottedPath))
      const sharedCoreKeys = [...bCoreKeys].filter(k => cCoreKeys.has(k))
      if (sharedCoreKeys.length > 0) {
        const bShared = baseline.results.filter(r => overlapping.includes(r.locale) && r.fixed === true && sharedCoreKeys.includes(r.dottedPath) && r.judgeScore)
        const cShared = results.filter(r => overlapping.includes(r.locale) && r.fixed === true && sharedCoreKeys.includes(r.dottedPath) && r.judgeScore)
        const bAvg = bShared.length > 0 ? bShared.reduce((s, r) => s + r.judgeScore.skillScore, 0) / bShared.length : null
        const cAvg = cShared.length > 0 ? cShared.reduce((s, r) => s + r.judgeScore.skillScore, 0) / cShared.length : null
        if (bAvg !== null && cAvg !== null) {
          const bAvgR = Math.round(bAvg * 100) / 100
          const cAvgR = Math.round(cAvg * 100) / 100
          console.log(`    Shared core keys (${sharedCoreKeys.length} keys × ${overlapping.length} locales): skill ${bAvgR} → ${cAvgR} (${cAvgR >= bAvgR ? '+' : ''}${(cAvgR - bAvgR).toFixed(2)})`)
        }
      }
    }

    console.log('\n  Per-locale regression deltas:')
    for (const locale of TEST_LOCALES) {
      const bLocale = baseline.results.filter(r => r.locale === locale && r.judgeScore)
      const cLocale = results.filter(r => r.locale === locale && r.judgeScore)
      if (bLocale.length === 0 || cLocale.length === 0) continue
      const bSkill = bLocale.reduce((s, r) => s + r.judgeScore.skillScore, 0) / bLocale.length
      const cSkill = cLocale.reduce((s, r) => s + r.judgeScore.skillScore, 0) / cLocale.length
      const delta = cSkill - bSkill
      const bSkillR = Math.round(bSkill * 100) / 100
      const cSkillR = Math.round(cSkill * 100) / 100
      const arrow = delta > 0.05 ? '↑' : delta < -0.05 ? '↓' : '→'
      console.log(`    ${locale}: ${bSkillR} → ${cSkillR} (${delta >= 0 ? '+' : ''}${delta.toFixed(2)}) ${arrow}`)
    }
  }
} else {
  console.log('\n--- No baseline found (first run) ---')
}

function buildSummaryObj(stats) {
  return {
    totalComparisons: stats.total,
    exactMatchCount: stats.exactMatchCount,
    exactMatchRate: Math.round((stats.exactMatchCount / stats.total) * 1000) / 10,
    validationPassCount: stats.validPass,
    validationPassRate: Math.round((stats.validPass / stats.total) * 1000) / 10,
    avgHumanScore: stats.avgHuman !== null ? Math.round(stats.avgHuman * 100) / 100 : null,
    avgSkillScore: stats.avgSkill !== null ? Math.round(stats.avgSkill * 100) / 100 : null,
    humanWins: stats.judged.length > 0 ? stats.humanWins : null,
    skillWins: stats.judged.length > 0 ? stats.skillWins : null,
    ties: stats.judged.length > 0 ? stats.ties : null,
    lowScoreCount: stats.judged.length > 0 ? stats.lowScores : null,
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  groundTruthSha: gt.gitSha,
  summary: {
    ...buildSummaryObj(overall),
    glossaryCorrectnessChecked: gcResults.length,
    glossaryCorrectnessPass: gcPass,
    glossaryCorrectnessRate: gcResults.length > 0 ? Math.round((gcPass / gcResults.length) * 1000) / 10 : null,
  },
  coreSummary: buildSummaryObj(coreStats),
  rotatingSummary: buildSummaryObj(rotatingStats),
  results,
}
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n')
console.log(`\nFull report written to ${REPORT_PATH}`)
