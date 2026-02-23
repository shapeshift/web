---
name: translate
description: Translate new/changed English UI strings into all supported languages using a translate-review-refine pipeline. Invoke with /translate to detect untranslated strings and produce high-quality translations for de, es, fr, ja, pt, ru, tr, uk, zh.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(node *), Bash(git diff*), Bash(git log*), Bash(git rev-parse*), Bash(wc *), Bash(mkdir *), Task, AskUserQuestion
---

# Automated i18n Translation Skill

Translates new or changed English UI strings into all 9 supported non-English languages using a translate-review-refine pipeline. Detects what changed, translates in batches with terminology glossary enforcement, validates output programmatically, and merges results into the existing translation files.

## Supported Languages

| Locale | Language | Register |
|--------|----------|----------|
| `de` | German | Formal (Sie) |
| `es` | Spanish | Informal (tú) |
| `fr` | French | Formal (vous) |
| `ja` | Japanese | Polite (です/ます) |
| `pt` | Portuguese (BR) | Informal (você) |
| `ru` | Russian | Formal (вы) |
| `tr` | Turkish | Formal (siz) |
| `uk` | Ukrainian | Formal (ви) |
| `zh` | Chinese (Simplified) | Neutral/formal |

See `.claude/skills/translate/locales/{locale}.md` for detailed locale-specific rules.

## Precautions

- **Do not translate `en`** — English is the source language.
- **Do not touch `id` or `ko`** — these locales exist on disk but are not imported in `index.ts` or declared in `constants.ts`.
- **Preserve existing translations** — only add/update keys, never delete existing translated keys.
- **Interpolation is sacred** — `%{variableName}` placeholders must survive translation intact, including exact variable names.
- **JSON validity** — all output files must be valid JSON. Validate before writing.
- **File format** — 2-space indent, trailing newline, UTF-8 encoding (matches `saveJSONFile` in `scripts/translations/utils.ts`).
- **The glossary is a living document** — it grows over time as new terms are identified. Check it at the start of every run.

## Step 1: Compute Translation Diff

Determine which English strings need translation.

### 1a. Check for marker file

```
Read src/assets/translations/.last-translation-sha
```

### 1b. If marker file exists — diff-based detection

The marker contains a git SHA from the last translation run. Use it to find new/modified English strings since then.

```bash
node .claude/skills/translate/scripts/diff.js
```

This follows the same recursive comparison pattern as `scripts/translations/utils.ts` `findStringsToTranslate()`.

### 1c. If no marker file — missing-key detection

Compare each non-English language against English to find missing keys:

```bash
node .claude/skills/translate/scripts/missing-keys.js
```

### 1d. Early exit

If no changes or missing keys are found, print:

> Translations are up to date. No new or modified English strings detected.

and stop.

### 1e. For modified keys (English value changed)

Mark these as needing re-translation in ALL languages, not just those missing the key.

## Step 2: Batching Strategy

Group the strings to translate by their **top-level JSON namespace** (the first segment of the dotted path, e.g., `agenticChat`, `common`, `trade`).

- Target **20-50 strings per batch**
- If a namespace has more than 50 strings, split into sub-batches of **30-35 strings, preserving original key order**
- If a namespace has fewer than 5 strings, combine with other small namespaces into a single batch
- Each batch item includes: `{ dottedPath, englishValue }`
- Keep batch contents together because namespace context improves translation consistency

## Step 3: Load Glossary

Read `src/assets/translations/glossary.json`. This file contains:
- Terms with value `null` = **never translate**, keep in English (e.g., "Bitcoin", "DeFi", "MetaMask")
- Terms with locale-keyed objects = **use the approved translation** for that language (e.g., "staking" → "ステーキング" in Japanese)

The glossary is passed to every translator and reviewer sub-agent. If the glossary file is missing or contains invalid JSON, log an error and exit immediately with a clear message.

## Step 3b: Cross-Reference Existing Translations for Term Consistency

Before translation begins, extract significant terms from the new English strings and search **all namespaces** in the target locale for existing translations containing those terms. This ensures that domain terms like "pool", "vault", "bridge", "fee", etc. are translated consistently with how they've already been translated elsewhere in the app — even across different namespaces.

Run the term-context script **once per locale at pipeline start**:

```bash
node .claude/skills/translate/scripts/term-context.js LOCALE NEW_STRINGS_JSON_OR_FILE
```

- `LOCALE` — the target locale code (e.g., `fr`)
- `NEW_STRINGS_JSON_OR_FILE` — path to a temp file containing the new strings as `[{ path, value }]` array or `{ "dotted.path": "english value" }` object

The script:
1. Extracts significant words and 2-word phrases from the new English strings (filtering stop words and glossary terms which are already handled)
2. Searches the full `{locale}/main.json` for existing translated strings whose English source contains those terms
3. Returns up to 3 matches per term, prioritizing multi-word phrases, capped at 30 terms total

Output format:
```json
{
  "liquidity pool": [
    { "key": "defi.liquidityPools.title", "en": "Liquidity Pool", "fr": "Pool de liquidité" }
  ],
  "fee": [
    { "key": "common.gasFee", "en": "Gas Fee", "fr": "Frais de gas" },
    { "key": "trade.networkFee", "en": "Network Fee", "fr": "Frais de réseau" }
  ]
}
```

Pass this as `{TERM_CONTEXT}` in the translator prompt (see Step 5a). If the script returns an empty object (no matching terms found in existing translations), omit the `{TERM_CONTEXT}` section from the prompt.

**Caching**: Run term-context.js and load few-shot context once per locale at pipeline start. Reuse this context for all batches of that locale — do not re-run scripts per batch.

## Step 4: Load Few-Shot Context from Existing Translations

Before translating each batch for a given locale, sample ~10 existing translations from the same namespace(s) being translated. These serve as tone/style reference for the translator.

1. Read `src/assets/translations/{locale}/main.json`
2. From the namespace(s) in the current batch, extract entries that are **not** in the batch being translated
3. Prefer entries of similar string length to the batch strings
4. Format as:
   ```json
   { "dotted.path": { "en": "English source", "{locale}": "Existing translation" } }
   ```
5. Pass as `{EXISTING_TRANSLATIONS_SAMPLE}` in the translator prompt (see Step 5a)

This grounds the translator in the existing voice and terminology of the project for that locale.

**Caching**: Load the locale file once at pipeline start and reuse for all batches of that locale.

## Step 4b: Prepare Locale Bundle

After loading few-shot context (Step 4), run `prepare-locale.js` **once per locale** to bundle all translation context into a single file. This prevents sub-agents from needing to read any codebase files.

```bash
node .claude/skills/translate/scripts/prepare-locale.js LOCALE --batches=BATCHES_FILE --term-context=TERM_CONTEXT_FILE --few-shot=FEW_SHOT_FILE
```

- `BATCHES_FILE` — path to a JSON file containing an array of batch objects (each batch is `{ "dotted.path": "english value" }`)
- `TERM_CONTEXT_FILE` — path to term-context output from Step 3b (omit if empty)
- `FEW_SHOT_FILE` — path to few-shot context from Step 4 (omit if empty)

Output: `/tmp/translate-{locale}.json` containing locale rules, glossary, term context, few-shot examples, and all batches in a single file.

## Step 5: Spawn Self-Contained Language Agents

Launch **9 Task sub-agents in parallel** (one per language) using the **Task tool** with `model: "sonnet"`. Each language agent owns its entire lifecycle: translate → validate → retry → review → refine → merge → verify.

The orchestrator's only job after spawning is to read status files and compile the report (Step 6).

### Language Agent Prompt

For each locale, spawn a Task with the following prompt (substituting `{LOCALE_CODE}` and `{LANGUAGE_NAME}`):

```
You are a self-contained translation agent for {LANGUAGE_NAME} ({LOCALE_CODE}) in a cryptocurrency/DeFi application.

You own the full translation lifecycle for your locale. Do NOT read any codebase source files — all context is in the locale bundle.

## Your Locale Bundle

Read `/tmp/translate-{LOCALE_CODE}.json`. It contains:
- `locale`, `language`, `register` — your target locale metadata
- `localeRules` — locale-specific translation rules (follow these precisely)
- `neverTranslate` — terms that must remain in English
- `approvedTerms` — terms with mandatory translations for your locale
- `termContext` — how key terms have been translated elsewhere in this project
- `fewShot` — reference translations for tone/style
- `batches` — array of batch objects, each containing:
  - `strings` — the key-value pairs to translate (`{ "dotted.path": "english value" }`)
  - `relevantNeverTranslate` — never-translate terms that appear in this batch's strings
  - `relevantApprovedTerms` — approved translations relevant to this batch

## Per-Batch Pipeline (process batches sequentially, 0-indexed)

For each batch in the `batches` array:

### 1. Translate

Translate all strings in `batch.strings` from English to {LANGUAGE_NAME}.

GLOSSARY REMINDER for this batch:
- Never translate these terms (keep in English): {batch.relevantNeverTranslate}
- Use these approved translations: {batch.relevantApprovedTerms}

RULES:
1. INTERPOLATION: Preserve all %{variableName} placeholders exactly as-is. Do not translate variable names inside %{}.
2. TERMINOLOGY:
   - NEVER TRANSLATE terms in `relevantNeverTranslate` for this batch (keep in English)
   - USE APPROVED TRANSLATIONS from `relevantApprovedTerms` for this batch
   - Also reference the full `neverTranslate` and `approvedTerms` in the bundle as fallback
   - When a term in `termContext` has an established translation, use it unless the context clearly demands a different meaning
3. Keep translations concise — UI space is limited. Match the approximate length of the English source.
4. FORMAT: Preserve HTML entities and markdown. If a string is a single word that's also a UI label (like "Done", "Cancel"), translate it as a UI action.
5. SOURCE FAITHFULNESS: Do not add information not present in the English source.
6. CONCISENESS: Prefer shorter synonyms or abbreviations common in {LANGUAGE_NAME} UI conventions.
7. KEY INTEGRITY: Output keys must EXACTLY match input keys. No additions, removals, or modifications to key names.
8. TAG KEYS: If the key path contains `.tags.`, the value is likely a short label or abbreviation. Preserve abbreviations as-is without expanding them. Check the `tagKeys` array in the bundle to identify these keys.

Use the `fewShot` examples from the bundle as tone/style reference.

### 2. Validate

Write the source batch (`batch.strings`) to `/tmp/batch-{LOCALE_CODE}-{BATCH_IDX}-source.json` and your translation to `/tmp/batch-{LOCALE_CODE}-{BATCH_IDX}-target.json`, then run:

```bash
node .claude/skills/translate/scripts/validate.js {LOCALE_CODE} /tmp/batch-{LOCALE_CODE}-{BATCH_IDX}-source.json /tmp/batch-{LOCALE_CODE}-{BATCH_IDX}-target.json
```

This outputs `{ rejected, flagged, passed }`.

### 3. Retry Rejected Strings

For any strings in `rejected`: re-translate them incorporating the rejection reason as feedback. Run validation again. Retry up to 2 times total. Strings that still fail after 2 retries become "manual review" items.

### 4. Review (spawn fresh sub-agent)

Collect flagged strings plus a 10% random sample of passed strings. If there are any strings to review, spawn a **separate reviewer sub-agent** using the Task tool (model: sonnet) with this prompt:

```
You are a senior localization reviewer for a cryptocurrency/DeFi application ({LANGUAGE_NAME}).
Do NOT read any other files from the codebase. All context you need is provided below.

Review these translations for quality. For each string, respond with either "approved" or a specific issue description.

LOCALE RULES:
{LOCALE_RULES_FROM_BUNDLE}

FOCUS ON:
1. Naturalness - does it sound natural to a native {LANGUAGE_NAME} speaker?
2. Semantic accuracy - does the translation accurately convey the English meaning?
3. Cultural appropriateness - are there any culturally awkward or inappropriate phrasings?
4. UI appropriateness - translations should be concise enough for UI elements
5. Source faithfulness - verify translation doesn't add information not in the English source

TERM CONTEXT:
{TERM_CONTEXT_FROM_BUNDLE}

VALIDATION FLAGS:
{FLAGS_FOR_FLAGGED_STRINGS_OR_NONE}

STRINGS TO REVIEW (JSON: { "path": { "en": "source", "translation": "target" } }):
{STRINGS_TO_REVIEW}

OUTPUT: JSON object with dotted paths as keys. Value is either "approved" or "Issue: [one-sentence description]".
```

### 5. Refine (spawn fresh sub-agent, conditional)

If the reviewer flagged any strings, spawn a **separate refiner sub-agent** using the Task tool (model: sonnet):

```
You are a professional UI translator for a cryptocurrency/DeFi application.
Do NOT read any other files from the codebase. All context you need is provided below.
Fix the following {LANGUAGE_NAME} translations based on reviewer feedback.

LOCALE RULES:
{LOCALE_RULES_FROM_BUNDLE}

RULES: Preserve %{placeholders}, use approved terminology, be concise, be faithful to source.

INPUT: { "dotted.path": { "en": "source", "translation": "current", "feedback": "Issue: ..." } }

STRINGS TO FIX:
{STRINGS_WITH_FEEDBACK}

OUTPUT: JSON object with dotted paths as keys and corrected translations as values.
```

Re-validate refined output. If it still fails after 1 retry, mark as "manual review".

### 6. Accumulate

After processing all batches, combine all passing translations into a single object.

## Post-Batch: Merge & Verify

After all batches are complete:

1. Write accumulated translations to `/tmp/translations-{LOCALE_CODE}-final.json`

2. Run merge (which creates a pre-merge backup automatically). By default, merge **only adds new keys** — existing translations are never overwritten. Pass `--force` only when re-translating changed English strings:
   ```bash
   node .claude/skills/translate/scripts/merge.js {LOCALE_CODE} /tmp/translations-{LOCALE_CODE}-final.json
   ```

3. Run post-merge validation:
   ```bash
   node .claude/skills/translate/scripts/validate-file.js {LOCALE_CODE} --pre-merge=/tmp/pre-merge-{LOCALE_CODE}.json
   ```

4. If validate-file reports `valid: false`:
   - Restore the pre-merge backup: copy `/tmp/pre-merge-{LOCALE_CODE}.json` back to `src/assets/translations/{LOCALE_CODE}/main.json`
   - Mark locale as "failed" in status

5. Write status to `/tmp/translate-status-{LOCALE_CODE}.json`:
   ```json
   {
     "locale": "{LOCALE_CODE}",
     "status": "success" | "failed",
     "translated": <count>,
     "manualReview": [{ "path": "...", "reason": "..." }],
     "errors": ["..."]
   }
   ```

## Error Handling

- **JSON parse failure** from your own translation: retry once with stricter instructions
- **Empty batch**: skip without processing
- **Sub-agent (reviewer/refiner) failure**: log as "manual review", continue with next batch
- Strings that fail all retries: include in `manualReview` array in status file
```

### Temp File Conventions

All files are namespaced by locale — zero overlap between parallel agents:

| File | Writer | Reader |
|------|--------|--------|
| `/tmp/translate-{locale}.json` | orchestrator | language agent |
| `/tmp/batch-{locale}-{idx}-source.json` | language agent | validate.js |
| `/tmp/batch-{locale}-{idx}-target.json` | language agent | validate.js |
| `/tmp/translations-{locale}-final.json` | language agent | merge.js |
| `/tmp/pre-merge-{locale}.json` | merge.js | language agent (rollback), validate-file.js |
| `/tmp/translate-status-{locale}.json` | language agent | orchestrator |

## Step 6: Update Marker & Report

After all 9 language agents complete, read their status files and compile results.

1. **Read status files**: Read `/tmp/translate-status-{locale}.json` for each locale. If a status file is missing, report that locale as "no response" (agent may have crashed — locale file is unchanged).

2. **Write marker file** (only if at least one locale succeeded):
   ```bash
   git rev-parse HEAD > src/assets/translations/.last-translation-sha
   ```

3. **Update glossary timestamp** (if glossary was modified during this run):
   Update `_meta.lastUpdated` in `src/assets/translations/glossary.json` to today's date.

4. **Print summary report**:
   ```
   === Translation Summary ===
   SHA marker: <sha>

   Strings translated: <count> across <locale_count> languages
   Strings skipped (manual review needed): <count>
   Locales failed (rolled back): <count>

   Per-language breakdown:
     de: <count> translated, <count> skipped [success|failed|no response]
     es: <count> translated, <count> skipped [success|failed|no response]
     ...

   Skipped strings (need manual review):
     - <dottedPath> (<locale>): <reason>
   ```

## Step 7: Glossary Update (conditional)

After all translations complete, scan for English terms that appear untranslated (kept as-is) in **7 or more locales**. These are candidates for the glossary never-translate list.

1. Collect terms that remained in English across most languages
2. Present candidates to the user for confirmation before adding
3. For confirmed terms, add to `src/assets/translations/glossary.json` with value `null`
4. Log additions in the summary report
