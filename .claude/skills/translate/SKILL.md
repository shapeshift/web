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

## Step 5: Translation Pipeline (per language, per batch)

### 5a. Translator Sub-Agent

Use the **Task tool** with `model: "sonnet"` to translate each batch.

Prompt template for the translator:

```
You are a professional UI translator for a cryptocurrency/DeFi application.
Translate the following English UI strings into {LANGUAGE_NAME} ({LOCALE_CODE}).

Do NOT read any other files from the codebase. All context you need is provided below.

Read the locale bundle from /tmp/translate-{LOCALE_CODE}.json and use batch index {BATCH_INDEX} (0-based) as the input to translate.

LOCALE RULES:
{LOCALE_RULES}

RULES:
1. INTERPOLATION: Preserve all %{variableName} placeholders exactly as-is. Do not translate variable names inside %{}.
2. TERMINOLOGY:
   - NEVER TRANSLATE these terms (keep in English): {NEVER_TRANSLATE_LIST}
   - USE APPROVED TRANSLATIONS: {APPROVED_TRANSLATIONS_FOR_THIS_LOCALE}
   - When a term below has an established translation in this project, use that same translation unless the context clearly demands a different meaning.
3. Keep translations concise - UI space is limited. Match the approximate length of the English source.
4. Do not add explanations or notes. Return ONLY a JSON object.
5. FORMAT: Preserve HTML entities and markdown in source strings. If a string is a single word that's also a UI label (like "Done", "Cancel"), translate it as a UI action.
6. SOURCE FAITHFULNESS: Do not add information, words, or context not present in the English source. The translation must convey exactly what the English says — nothing more, nothing less.
7. CONCISENESS: UI labels must be short. If the locale naturally produces longer text, prefer shorter synonyms or abbreviations common in that locale's UI conventions.
8. KEY INTEGRITY: Your output keys must EXACTLY match the input keys. Do not rename, rewrite, or substitute any key paths. The output JSON must contain the same set of dotted paths as the input — no additions, no removals, no modifications to key names.

TERM CONTEXT (how key terms in these strings have been translated elsewhere in this project):
{TERM_CONTEXT}

REFERENCE TRANSLATIONS (existing translations from this project for tone/style reference):
{EXISTING_TRANSLATIONS_SAMPLE}

INPUT (JSON object with dotted paths as keys and English strings as values):
{BATCH_JSON}

OUTPUT: Return a single JSON object with the SAME keys and translated values. Nothing else.
```

Where `{LOCALE_RULES}` is loaded from the locale bundle (or `.claude/skills/translate/locales/{locale}.md`). The `{BATCH_INDEX}` is the 0-based index into the `batches` array in the locale bundle file.

Parse the returned JSON. If it doesn't parse, retry once with "Return ONLY valid JSON, no markdown fences."

### 5b. Programmatic Validation

After receiving translator output, run the validation script:

```bash
node .claude/skills/translate/scripts/validate.js LOCALE SOURCE_JSON TARGET_JSON --term-context=TERM_CONTEXT_FILE
```

The script checks:

0. **Key integrity**: Verify the output key set exactly matches the input key set. Reject any key in the output that doesn't exist in the input ("unexpected key" — translator hallucinated a different key path). Reject any input key missing from the output ("missing key"). Already-rejected keys are skipped by subsequent checks.

1. **Placeholder integrity**: Extract all `%{...}` tokens from source and target. They must be identical sets (reject if mismatch). Additionally, flag if placeholders appear in different order (grammar may require reordering — flag, not reject).

2. **Length ratio**: Flag if `target.length / source.length > 3.0` or `< 0.25` (for CJK locales `ja` and `zh`: `> 4.0` and `< 0.15`).

3. **Empty/whitespace**: Reject if translated value is empty or whitespace-only.

4. **Untranslated detection**: Flag if target === source AND the source has more than 3 words (single-word labels and brand names are expected to stay the same).

5. **Wrong-script detection**: For locales `ja`, `zh` — flag strings where >70% of non-whitespace, non-placeholder, non-glossary characters are Latin. For `ru`, `uk` — same threshold.

6. **Glossary compliance**: Check that "never translate" terms appear unchanged. Check that terms with approved translations use the approved form.

7. **Term consistency** (if term-context available): For each term where all existing matches agree on a single translation, flag if the new translation uses a different word.

Output: `{ "rejected": [...], "flagged": [...], "passed": [...] }`

- **Auto-reject** (send back to translator with error): key integrity mismatch (unexpected/missing keys), empty/whitespace, JSON parse failure, placeholder set mismatch.
- **Flag for reviewer** (pass to reviewer with note): length ratio, untranslated suspicion, wrong-script, glossary violations, term consistency deviations, placeholder reorder.

### 5c. Reviewer Sub-Agent

Use the **Task tool** with `model: "sonnet"` for review.

Invoke the reviewer for **flagged strings plus a 10% random sample of passed strings** as a spot-check. If no strings are flagged and the passed sample is clean, skip the reviewer for this batch.

Prompt template for the reviewer:

```
You are a senior localization reviewer for a cryptocurrency/DeFi application ({LANGUAGE_NAME}).

Do NOT read any other files from the codebase. All context you need is provided below.

Review these translations for quality. For each string, respond with either "approved" or a specific issue description.

LOCALE RULES:
{LOCALE_RULES}

FOCUS ON (things programmatic validation cannot catch):
1. Naturalness - does it sound natural to a native {LANGUAGE_NAME} speaker?
2. Semantic accuracy - does the translation accurately convey the English meaning?
3. Cultural appropriateness - are there any culturally awkward or inappropriate phrasings?
4. UI appropriateness - translations should be concise enough for UI elements
5. Source faithfulness - verify translation doesn't add information not in the English source

TERM CONTEXT (how key terms have been translated elsewhere — flag inconsistencies):
{TERM_CONTEXT}

VALIDATION FLAGS (pay special attention to these):
{VALIDATION_FLAGS_IF_ANY}

STRINGS TO REVIEW:
{STRINGS_WITH_SOURCE_AND_TRANSLATION}

OUTPUT: JSON object with dotted paths as keys. Value is either `"approved"` or `"Issue: [one-sentence description]"`. Always prefix issues with "Issue:" for parseability.
```

When populating `{VALIDATION_FLAGS_IF_ANY}`: if no flags exist for this batch, insert "(No validation flags for this batch — review all strings normally.)"

If >80% of strings are approved, only the flagged strings proceed to refinement.

### 5d. Refiner Sub-Agent (conditional)

Use the **Task tool** with `model: "sonnet"` only for strings the reviewer flagged.

Prompt template:

```
You are a professional UI translator for a cryptocurrency/DeFi application.
Do NOT read any other files from the codebase. All context you need is provided below.
Fix the following {LANGUAGE_NAME} translations based on reviewer feedback.

For each string below, you have: the English source, the rejected translation, and the reviewer's feedback.
Produce a corrected translation that addresses the feedback.

LOCALE RULES:
{LOCALE_RULES}

RULES: Same as translator rules (interpolation, terminology, conciseness, format, source faithfulness).

INPUT FORMAT:
{ "dotted.path": { "en": "English source", "translation": "Current translation", "feedback": "Issue: ..." } }

STRINGS TO FIX:
{STRINGS_WITH_FEEDBACK}

OUTPUT: JSON object with dotted paths as keys and corrected translations as values. Nothing else.
```

Re-validate the refined output programmatically. If it still fails validation after 1 retry, skip it and include in the final report as "needs manual review".

## Error Handling

- **JSON parse failure** (translator/refiner): Retry once with "Return ONLY valid JSON, no markdown fences." If retry fails, skip batch, log to summary as "needs manual review."
- **Empty batch after filtering**: Skip without invoking sub-agents.
- **Sub-agent timeout**: Log as "needs manual review", continue with next language/batch.
- **Glossary file missing/malformed**: Log error and exit with clear message.

## Step 6: Parallel Execution Strategy

Launch **9 Task sub-agents in parallel** (one per language). Within each language, process batches **sequentially** to maintain terminology consistency across namespaces.

For each language, the full pipeline is: translate batch → validate → review (if needed) → refine (if needed) → next batch.

## Step 7: Merge Results

After all languages complete, merge translations into the existing files.

For each locale:

1. Read `src/assets/translations/{locale}/main.json`
2. Deep-merge the new translations into the existing nested structure
3. **Preserve key ordering from the English file** — use the English file as the structural template to determine key order
4. Write back with `JSON.stringify(data, null, 2) + '\n'` (2-space indent, trailing newline — matches existing format per `scripts/translations/utils.ts` `saveJSONFile`)

Run the merge script:

```bash
node .claude/skills/translate/scripts/merge.js LOCALE TRANSLATIONS_JSON_OR_FILE
```

Replace `LOCALE` with the locale code and pass either a stringified JSON of `{ dottedPath: translatedValue }` pairs or a path to a temp file containing the JSON. For large payloads, prefer the temp file approach.

## Step 8: Update Marker & Report

After all merges are complete:

1. **Write marker file**:
   ```bash
   git rev-parse HEAD > src/assets/translations/.last-translation-sha
   ```

2. **Update glossary timestamp** (if glossary was modified during this run):
   Update `_meta.lastUpdated` in `src/assets/translations/glossary.json` to today's date.

3. **Print summary report**:
   ```
   === Translation Summary ===
   SHA marker: <sha>

   Strings translated: <count> across <locale_count> languages
   Strings skipped (manual review needed): <count>
   New glossary terms added: <count>

   Per-language breakdown:
     de: <count> translated, <count> skipped
     es: <count> translated, <count> skipped
     ...

   Skipped strings (need manual review):
     - <dottedPath> (<locale>): <reason>
   ```

## Step 9: Glossary Update (conditional)

After all translations complete, scan for English terms that appear untranslated (kept as-is) in **7 or more locales**. These are candidates for the glossary never-translate list.

1. Collect terms that remained in English across most languages
2. Present candidates to the user for confirmation before adding
3. For confirmed terms, add to `src/assets/translations/glossary.json` with value `null`
4. Log additions in the summary report
