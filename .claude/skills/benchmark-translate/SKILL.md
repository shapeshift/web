---
name: benchmark-translate
description: Run a quality benchmark of the /translate skill by selecting stratified test keys, capturing ground truth, translating, judging with sub-agents, and compiling a regression report. Invoke with /benchmark-translate.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(node *), Bash(git checkout*), Bash(git diff*), Bash(git status*), Bash(git rev-parse*), Task, Skill, AskUserQuestion
---

# Translation Quality Benchmark

Measures the quality of the `/translate` skill by comparing its output against existing human translations. Uses stratified key selection with a fixed/rotating split, LLM judges, and programmatic validation to produce a comprehensive quality report with regression tracking across all 9 supported locales.

## Data Artifacts

All benchmark data lives in `scripts/translations/benchmark/` (gitignored):

| File | Purpose |
|------|---------|
| `testKeys.json` | Selected test keys with categories and `fixed` flag |
| `coreKeys.json` | Persistent core key set (stable across runs) |
| `ground-truth.json` | Captured human translations before removal |
| `report.json` | Latest benchmark report (becomes baseline on next run) |
| `baseline.json` | Previous report (auto-copied by setup.js) |

## Pipeline (7 Steps)

### Step 1: Select Keys

```bash
node .claude/skills/benchmark-translate/scripts/select-keys.js [--count N] [--core N]
```

Selects N keys (default 150) stratified across 6 categories: glossary-term, financial-error, single-word, interpolation, defi-jargon, general. Validates all selected keys exist in en + all 9 locales.

**Fixed/rotating split:**
- `--core N` (default 100): Number of fixed core keys for stable regression tracking
- `--count N` (default 150): Total keys (core + rotating)
- If `coreKeys.json` exists: loads it, validates keys still exist in all locales, tops up if needed
- If `coreKeys.json` doesn't exist: selects core keys via stratified sampling and saves them
- Remaining keys (default 50) are randomly selected as rotating keys from the non-core pool
- Each entry in `testKeys.json` has `"fixed": true` (core) or `"fixed": false` (rotating)

Outputs `scripts/translations/benchmark/testKeys.json`.

### Step 2: Setup

```bash
node .claude/skills/benchmark-translate/scripts/setup.js
```

- If `report.json` exists from a previous run, copies it to `baseline.json`
- Reads `testKeys.json`, captures ground truth translations for all 9 locales
- Writes `ground-truth.json`
- Removes test keys from locale files so `/translate` can regenerate them

### Step 3: Translate

Invoke the `/translate` skill using the Skill tool. This regenerates the removed keys through the full translate-review-refine pipeline.

### Step 4: Judge (Sub-Agents)

Launch **9 sub-agents in 3 waves of 3** (matching `/translate`'s wave structure) using the Task tool. Each sub-agent receives the locale info, all key triplets, and glossary terms.

**Wave 1:** de, es, fr
**Wave 2:** pt, ru, tr
**Wave 3:** ja, uk, zh

**For each locale, use this prompt:**

```
You are an expert multilingual localization quality assessor for a cryptocurrency/DeFi application.
Rate translations from English into {LANGUAGE_NAME} on a 1-5 scale.

1 = Wrong/misleading meaning
2 = Significant issues (wrong register, missing nuance)
3 = Acceptable but could be more natural
4 = Good, natural, accurate
5 = Excellent, indistinguishable from professional native translation

Check: meaning preservation, naturalness, register ({REGISTER}), UI conciseness,
glossary compliance (these stay English: {NEVER_TRANSLATE_TERMS}),
placeholder integrity (%{...} preserved), DeFi terminology conventions.

Rate each translation INDEPENDENTLY. Community translations can contain errors.

Input: JSON array of {key, english, human, skill}
{ITEMS_JSON}

Output: Return ONLY a JSON array of objects with these exact fields:
{key, humanScore, skillScore, humanJustification, skillJustification, preferenceNote}

Scores must be integers 1-5. Justifications should be 1-2 sentences. preferenceNote should say which is better and why, or "tie" if equal.
```

**Locale info for prompt substitution:**

| Locale | Language | Register |
|--------|----------|----------|
| `de` | German | Formal (Sie) |
| `es` | Spanish | Informal (tú) |
| `fr` | French | Formal (vous) |
| `ja` | Japanese | Polite (です/ます) |
| `pt` | Portuguese | Informal (você) |
| `ru` | Russian | Formal (вы) |
| `tr` | Turkish | Formal (siz) |
| `uk` | Ukrainian | Formal (ви) |
| `zh` | Chinese (Simplified) | Neutral/formal |

**Building the items array for each locale:**

1. Read `scripts/translations/benchmark/ground-truth.json`
2. Read the current (post-translate) `src/assets/translations/{locale}/main.json`
3. For each test key, build: `{ key: dottedPath, english: groundTruth.english[key], human: groundTruth.groundTruth[locale][key], skill: getValueFromLocaleFile(key) }`

**Getting never-translate terms:** Read `src/assets/translations/glossary.json`, collect all keys where value is `null` (excluding `_meta`).

**Each sub-agent must write its output** to `/tmp/{locale}-judge-scores.json`. Parse the JSON array from the sub-agent's response and write it to that path.

### Step 5: Compile Report

```bash
node .claude/skills/benchmark-translate/scripts/compile-report.js
```

Loads judge scores from `/tmp/{locale}-judge-scores.json`, runs programmatic validation (including Cyrillic script check for ru/uk), computes summary stats, and writes `scripts/translations/benchmark/report.json`. If `baseline.json` exists, includes regression deltas. Report includes `coreSummary` and `rotatingSummary` alongside the overall `summary`.

### Step 6: Restore

```bash
node .claude/skills/benchmark-translate/scripts/restore.js
```

Restores locale files via `git checkout --`, verifies no diff remains.

### Step 7: Present Results

Read the compile output (printed to stdout) and present to the user:
- Overall score summary with baseline regression (if available)
- Core vs rotating stats (divergence suggests overfitting)
- Notable improvements/regressions
- Per-locale and per-category highlights
- Any items needing attention (low scores, validation failures, glossary issues)
