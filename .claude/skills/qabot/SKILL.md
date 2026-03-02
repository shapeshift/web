---
name: qabot
description: Run QA tests using agent-browser and post results to the qabot dashboard. Interactive mode helps craft fixtures. With a fixture provided (or for automated runs like clawdbot releases), executes tests and reports results. Use when user says "qa test", "run qabot", "/qabot", or when running automated QA.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, WebFetch, AskUserQuestion
---

# qabot - QA Testing Skill

You are running QA tests and reporting results to the qabot dashboard. qabot is a platform for QA reports - operators (humans with Claude, or clawdbot for automated runs) authenticate via a shared API key and push test results.

## Environment

Secrets are stored in `~/.secrets` (sourced by `~/.zshrc`). Required env vars:

- `QABOT_API_KEY` - shared API key for write access to qabot
- `QABOT_OPERATOR` - your operator name (e.g. "gomes", "clawdbot") - labels who ran what
- `NATIVE_WALLET_PASSWORD` - native wallet password for agent-browser wallet unlock

```bash
# Verify env is set - all three MUST be present
echo "QABOT_API_KEY: ${QABOT_API_KEY:+set}"
echo "QABOT_OPERATOR: ${QABOT_OPERATOR:+set}"
echo "NATIVE_WALLET_PASSWORD: ${NATIVE_WALLET_PASSWORD:+set}"
```

If any of these are missing, tell the user to add them to `~/.secrets`. The API key is shared among trusted operators.

## Ports

- **Web dev server** (ShapeShift app): `localhost:3000`
- **qabot API/dashboard**: `localhost:8080` (dev) or deployed URL

## Modes

### Interactive Mode (no fixture provided)

When the user says something like "qa test the trade page" or "run qabot" without a specific fixture:

1. **Ask what to test** - use AskUserQuestion to clarify what functionality to test
2. **Help craft a fixture** - build a YAML fixture collaboratively with the user
3. **Save the fixture** - write to `e2e/fixtures/<name>.yaml`
4. **Execute the fixture** - run the tests via agent-browser
5. **Report results** - push to qabot

### Fixture Mode (fixture provided or automated)

When a specific fixture file is provided, or running as part of an automated flow (clawdbot release, CI trigger):

1. **Load the fixture** - read the YAML file from `e2e/fixtures/`
2. **Resolve dependencies** - if the fixture has `depends_on`, load those fixtures first (recursively)
3. **Execute all steps** - run dependency fixtures first, then the main fixture, all in one browser session
4. **Capture results** - screenshots + pass/fail per step (step indices are continuous across all fixtures)
5. **Report to qabot** - create run, upload screenshots, push results, post PR comment if applicable

## Fixture Format

```yaml
name: Test Name
description: What this tests
route: /trade
depends_on:
  - wallet-health.yaml       # runs this fixture first, wallet unlock etc.
steps:
  - name: Step name
    instruction: Natural language instruction for agent-browser
    expected: What should be true after this step
    screenshot: true  # optional, take screenshot after step
```

### Composability

Fixtures can declare `depends_on` - a list of other fixture filenames that must run first.

- Dependencies are resolved recursively and deduplicated (each fixture runs at most once)
- All fixtures run sequentially in one browser session - the page state carries over
- Step indices are continuous across all fixtures (dep fixture steps come first)
- All steps from all fixtures go into a single qabot run
- The `fixtureFile` for the run is the top-level fixture name

Example: `eth-to-fox-swap.yaml` depends on `wallet-health.yaml`. When you run eth-to-fox-swap:
1. wallet-health runs first (7 steps: dismiss onboarding, unlock wallet, verify page)
2. eth-to-fox-swap steps run next (5 steps: select assets, enter amount, verify quote)
3. Total: 12 steps in one run, indices 0-11

### Onboarding Dialog

On first visit to any origin (gome.shapeshift.com, release.shapeshift.com, etc.), ShapeShift shows an onboarding splash dialog ("Self-Custody", "You own your keys") with "Skip" and "Next" buttons. The wallet-health fixture handles dismissing this. Always run wallet-health as a dependency for other fixtures.

## agent-browser Session

**IMPORTANT**: Always use the `qabot` profile. The native wallet is stored in this profile's IndexedDB per-origin.

```bash
agent-browser --session qabot --profile ~/.agent-browser/profiles/qabot open <url>
```

The profile at `~/.agent-browser/profiles/qabot` stores the native wallet (IndexedDB, localStorage, cookies) per origin. Import the wallet once per origin in headed mode, then reuse.

First time setup per origin (headed, import wallet manually):
```bash
agent-browser --session qabot --profile ~/.agent-browser/profiles/qabot --headed open <url>
# Import the native wallet, set password to $NATIVE_WALLET_PASSWORD, close.
# Subsequent runs reuse the persisted profile.
```

Origins where the wallet has been imported:
- `http://localhost:3000` (local dev)
- `https://gome.shapeshift.com` (gome staging)
- `https://release.shapeshift.com` (release staging)

### Wallet Unlock

The native wallet requires a password on each session start. The wallet-health fixture handles this. If running without wallet-health, handle it manually:

1. Check for onboarding dialog first - click "Skip" if present
2. The "Enter Your Password" dialog may or may not appear automatically depending on the page:
   - On some pages, the wallet modal opens automatically with the unlock prompt
   - On other pages (e.g. /trade), you'll see "Connect Wallet" in the top-right nav instead
   - If you see "Connect Wallet", click it, then **wait 5 seconds** for native wallets to load in the modal
   - If the "test" wallet appears in the wallet list on the left side of the modal, click it to get the password prompt
   - Note: the nav button may still say "Connect Wallet" even while the wallet is loading/connecting - this is normal
3. Click the wallet name button (e.g. "test", "teest") if wallet selection is shown
4. Focus the password input via JS eval (click --ref often times out on external origins):
   `eval "document.querySelector('input[type=password], input[placeholder*=Password]')?.focus()"`
5. Type `$NATIVE_WALLET_PASSWORD` character by character using `press` (NOT `fill` - React controlled inputs need keypress events)
6. Click "Next" via JS eval:
   `eval "$(cat /tmp/click-next.js)"`
7. Wait 8+ seconds for external origins to fully hydrate

### Tips

#### JS Eval & Smart Quotes (CRITICAL)

- **Smart quotes kill JS eval**: Claude's output produces unicode smart quotes (`"` `"` `'` `'`) which cause `SyntaxError: Invalid or unexpected token` in agent-browser eval. **NEVER write JS inline in eval commands.** Always write JS to a temp file first with `printf`, then `cat` it:
  ```bash
  printf 'var btns=document.querySelectorAll("button"); for(var i=0;i<btns.length;i++){if(btns[i].textContent.trim()==="Preview Trade"){btns[i].click();break;}}' > /tmp/click-preview.js
  agent-browser --session qabot eval "$(cat /tmp/click-preview.js)"
  ```
- **Pre-write common click helpers at session start**: Before executing any steps, create these reusable JS files in `/tmp/`. This avoids smart quote issues and speeds up execution:
  ```bash
  # Write all click helpers upfront
  printf 'var btns=document.querySelectorAll("button"); for(var i=0;i<btns.length;i++){if(btns[i].textContent.trim()==="Close"){btns[i].click();}}' > /tmp/click-close.js
  printf 'var btns=document.querySelectorAll("button"); for(var i=0;i<btns.length;i++){if(btns[i].textContent.trim()==="Maybe Later"){btns[i].click();}}' > /tmp/click-later.js
  printf 'var btns=document.querySelectorAll("button"); for(var i=0;i<btns.length;i++){if(btns[i].textContent.includes("Switch Assets")){btns[i].click();break;}}' > /tmp/click-switch.js
  printf 'var btns=document.querySelectorAll("button"); for(var i=0;i<btns.length;i++){if(btns[i].textContent.includes("Sign")&&btns[i].textContent.includes("Swap")){btns[i].click();break;}}' > /tmp/click-sign.js
  printf 'var btns=document.querySelectorAll("button"); for(var i=0;i<btns.length;i++){if(btns[i].textContent.trim()==="Confirm and Trade"){btns[i].click();break;}}' > /tmp/click-confirm.js
  printf 'var btns=document.querySelectorAll("button"); for(var i=0;i<btns.length;i++){if(btns[i].textContent.trim()==="I understand"){btns[i].click();break;}}' > /tmp/click-understand.js
  printf 'var btns=document.querySelectorAll("button"); for(var i=0;i<btns.length;i++){if(btns[i].textContent.trim()==="Preview Trade"){btns[i].click();break;}}' > /tmp/click-preview.js
  printf 'var btns=document.querySelectorAll("button"); for(var i=0;i<btns.length;i++){if(btns[i].textContent.trim()==="Got It"){btns[i].click();break;}}' > /tmp/click-gotit.js
  printf 'var btns=document.querySelectorAll("button"); for(var i=0;i<btns.length;i++){if(btns[i].textContent.trim()==="Skip"){btns[i].click();break;}}' > /tmp/click-skip.js
  printf 'var btns=document.querySelectorAll("button"); for(var i=0;i<btns.length;i++){if(btns[i].textContent.trim()==="Next"){btns[i].click();break;}}' > /tmp/click-next.js
  ```
  Then use them: `agent-browser --session qabot eval "$(cat /tmp/click-close.js)"`

#### Clicking on External Origins

- **Clicking on external origins**: `click --ref` and `click --text` frequently time out on gome/release.shapeshift.com (elements blocked by overlays or slow hydration). **Always prefer JS eval for clicking on external origins**.
- **`.click()` vs `dispatchEvent`**: Some buttons on external origins don't respond to `.click()` (e.g. asset picker avatars). Use `dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true}))` as a more reliable fallback. Example for asset avatar buttons:
  ```js
  var btn=document.querySelector("button[class*=avatar]"); if(btn) btn.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true}));
  ```
- **Cookie/tracking banner**: On external origins, a cookie banner ("Our dApp uses anonymized click tracking...") appears with a "Got It" button. **Dismiss this immediately after page load** - it can block interactions. The wallet-health fixture should handle this.

#### Asset Picker

- **Asset picker multi-chain**: Assets like FOX exist on multiple chains. Clicking the asset button once expands to show chain variants - click the specific chain variant (e.g. "Ethereum (FOX)") from the expanded list. Primary assets like SOL, BTC, RUNE don't need expansion.
- **Asset picker interaction**: Open sell asset picker by JS-clicking the sell asset avatar button. Search by focusing the search input via JS eval then pressing characters. Select results by JS-clicking the matching button.
- **Switch Assets is unreliable after swaps**: After completing a swap, the "Switch Assets" button may not reverse assets. Always verify via snapshot after clicking. If it didn't work, fall back to manually selecting assets via the pickers.

#### Screenshots

- **Always use absolute paths for screenshots**: Use `/tmp/step-N-name.png`, NOT relative paths. Relative paths cause resolution issues between agent-browser's cwd and the shell's cwd. `curl -F file@...` will fail with exit code 26 if the path is wrong.
  ```bash
  agent-browser --session qabot screenshot "/tmp/step-0-dismiss-onboarding.png"
  ```
- **Screenshots are temporary**: Screenshots are saved to `/tmp/` only as a temp step before uploading to Vercel Blob. After uploading, `rm` the local file. Do NOT accumulate local screenshots.
- **Delete after successful push**: The `step-complete` endpoint handles screenshot upload server-side. After a successful curl (HTTP 201), delete the local file with `rm -f`.
- **Screenshots timing**: Always take screenshots AFTER verifying the expected state via snapshot, not before. Early screenshots capture intermediate states.

#### Agent Thought / Action Logging

- **Agent thoughts must be user-facing**: `agentThought` and `actionTaken` fields in results should read like a QA engineer's notes, NOT implementation details. Write "Focused password input, typed password" not "JS eval to focus input, press chars one by one". Describe what happened from a user's perspective, not the automation method used.
- **No developer jargon**: Never use terms like "React controlled input", "nativeInputValueSetter", "dispatchEvent", "HStack", "Chakra modal". Write like a human QA tester: "Entered amount in the input field", "Clicked the account button", "Toggled to dollar input mode".
- **Shell expansion in curl fields**: Dollar signs in `-F` field values get shell-expanded (e.g. `$0.10` becomes `/bin/zsh.10`). **Always use single quotes** for `-F` values containing dollar signs: `-F 'agentThought=Entered 10 cents'`. Or avoid dollar signs entirely - write "10 cents" or "0.10 USD" instead of "$0.10".

#### Swap Flow Gotchas

- **Check balances before setting amounts**: Always snapshot and read the balance display before entering a swap amount. If the wallet balance is less than the intended amount + gas, reduce the amount. Example: SOL balance was $0.989, $1 + gas failed. Reduced to $0.50.
- **Fiat toggle persists between swaps**: After the first swap, fiat mode may already be active. Always check the input placeholder before toggling - if it already shows "$0", skip the toggle.
- **Warning dialogs during swap**: Two common warnings appear after clicking Preview Trade or Confirm and Trade:
  1. "Below recommended minimum" - for small amounts. Click "I understand" to proceed.
  2. "Price impact" - for high slippage (common with small THORChain trades). Click "I understand" to proceed.
- **Preview Trade loading loop**: On gome/release origins, clicking "Preview Trade" sometimes shows "Loading... Preview Trade" indefinitely then bounces back to enabled. The fix: click Preview Trade, then immediately (within 2-3s) check for and click "I understand" on the below-minimum warning. The warning appearing while loading causes the loop. Sequence:
  ```bash
  agent-browser --session qabot eval "$(cat /tmp/click-preview.js)"
  sleep 2
  agent-browser --session qabot eval "$(cat /tmp/click-understand.js)"
  sleep 3
  # Then verify Confirm Details screen appeared via snapshot
  ```
- **THORChain swap timing**: SOL->RUNE completes in ~10s, RUNE->SOL can take ~90s. Always poll with 120s timeout.
- **Feedback dialog after swap**: A "How was your trade experience?" dialog appears after swaps complete. Dismiss with "Maybe Later" button.

#### Bug Investigation (CRITICAL)

When you encounter what looks like a bug, **don't just report it — investigate it**:

1. **Verify identity**: Is this the exact same yield ID, same account ID, same chain? Check the URL params (`yieldId`, `accountId`). A "discrepancy" between two different yields isn't a bug.
2. **Check network requests**: Open the browser's Network tab (or use JS eval to intercept fetch responses) to see what the API actually returned vs what the UI shows. Include the raw API response in your agentThought.
3. **Read the codebase**: You have access to `~/Sites/shapeshiftWeb`. `grep` for the relevant component, selector, or API call. Understand WHERE the bug likely originates (frontend rendering? stale cache? API response?).
4. **Cross-reference surfaces**: Check the same data across multiple views (yield detail page, My Positions list, DeFi drawer, wallet drawer). Note exactly which surfaces show correct vs incorrect data.
5. **Navigate freely**: You can explore the entire app to verify bugs — click around, check different pages, use filters. Just don't execute transactions outside fixture constraints.
6. **Write it up with confidence**: In agentThought, explain: what you expected, what you saw, what the API returned, what the code does, and your conclusion on where the bug is. Don't just say "possible bug" — say "confirmed bug in X component because Y".

#### Shell & Environment

- **zsh gotchas**: `$VAR` as command doesn't work in zsh. `!` negation in inline scripts causes "command not found: !". Use `grep -v` or numeric comparison instead. macOS `date` doesn't support `%3N` for milliseconds - use `python3 -c 'import time; print(int(time.time()*1000))'`. `status` is a read-only variable in zsh - use `result_status` instead.
- Use `snapshot` after every action to verify state
- Close the session when done: `agent-browser --session qabot close`
- External origins (gome, release) are slower than localhost - use longer waits (8-10s after wallet unlock)

## Execution Flow

### 1. Set up auth

```bash
source ~/.secrets
QABOT="${QABOT_URL:-http://localhost:8080}"
BASE_URL="${BASE_URL:-http://localhost:3000}"
```

All write requests use:
- `Authorization: Bearer $QABOT_API_KEY`
- `X-Qabot-Operator: $QABOT_OPERATOR`

### 2. Detect enabled chains (for multi-chain fixtures)

Some fixtures (e.g. `send-receive.yaml`) test multiple chains. Before executing, detect
which chains are actually enabled in the target environment. Use **read-only** operations only.

**First-class chains** (always enabled, no feature flag):
Ethereum, Bitcoin, Bitcoin Cash, Dogecoin, Litecoin, Cosmos Hub, THORChain, Avalanche

**Feature-flagged chains** need `VITE_FEATURE_<FLAG>=true` in the effective env config.
Vite precedence: `.env.production` overrides `.env` (base). Check both files:

```bash
# WEB_REPO should already be set from section 4 (branch detection).
# If not, detect it from the port 3000 process or set it manually.

# One-liner: merge .env + .env.production (later overrides), extract enabled chain flags
ENABLED_FLAGS=$(cat "$WEB_REPO/.env" "$WEB_REPO/.env.production" 2>/dev/null | \
  grep '^VITE_FEATURE_' | \
  awk -F= '{flags[$1]=$2} END{for(f in flags) if(flags[f]=="true") print f}' | \
  sed 's/VITE_FEATURE_//' | sort)

# $ENABLED_FLAGS now contains flag names like: ARBITRUM, BASE, BNBSMARTCHAIN, ...
# Cross-reference with the fixture's chain list to determine which chains to test.
```

Flag name → chain mapping (from `src/config.ts` and `src/constants/chains.ts`):
OPTIMISM, BNBSMARTCHAIN, POLYGON, GNOSIS, ARBITRUM, SOLANA, STARKNET, TRON, SUI, NEAR,
TON, BASE, MONAD, HYPEREVM, PLASMA, MANTLE, INK, MEGAETH, BERACHAIN, CRONOS, KATANA,
FLOWEVM, CELO, PLUME, STORY, ZK_SYNC_ERA, BLAST, ETHEREAL, WORLDCHAIN, HEMI, SEI,
LINEA, SCROLL, SONIC, UNICHAIN, BOB, MODE, SONEIUM, MAYACHAIN, ZCASH

Note: `.env.production` can explicitly disable chains that `.env` enables (e.g. `FLOWEVM=false`).

### 3. Resolve fixture dependencies

```bash
# Read the fixture YAML
# If depends_on is present, load each dependency recursively
# Deduplicate (each fixture runs once even if referenced multiple times)
# Build ordered list: [dep1_steps, dep2_steps, ..., main_fixture_steps]
# Step indices are continuous: 0, 1, 2, ... across all fixtures
```

### 4. Detect branch and commit

Branch and commit must reflect the **web app being tested**, NOT the qabot repo.
Use **read-only git operations only** (fetch, rev-parse) - NEVER switch branches.

```bash
GITHUB_REPO="shapeshift/web"

# Origin-to-branch mapping (CloudFlare Pages deployments):
#   localhost:3000         → local branch (detected from dev server process)
#   gome.shapeshift.com   → gome
#   release.shapeshift.com → release
#   develop.shapeshift.com → develop
#   app.shapeshift.com    → main
#   neo.shapeshift.com    → neo

if [[ "$BASE_URL" == *"localhost"* ]]; then
  # Local dev: detect web repo from the process actually serving port 3000
  # This handles worktrees correctly (main repo vs .worktrees/qabot etc.)
  DEV_PID=$(lsof -i :3000 -sTCP:LISTEN -n -P -t 2>/dev/null | head -1)
  if [ -n "$DEV_PID" ]; then
    WEB_REPO=$(lsof -p "$DEV_PID" 2>/dev/null | awk '/cwd/{print $NF}')
  fi
  # Fallback: infer from context (check WEB_REPO env var, or ask the user)
  if [ -z "$WEB_REPO" ]; then
    echo "ERROR: Could not detect web repo from port 3000. Set WEB_REPO env var." >&2
    exit 1
  fi
  BRANCH=$(git -C "$WEB_REPO" rev-parse --abbrev-ref HEAD)
  COMMIT=$(git -C "$WEB_REPO" rev-parse HEAD)
else
  # Remote origin: infer WEB_REPO from context for git fetch
  # (any local clone of shapeshift/web works - agent should find it)
  # Remote origin: map URL to branch, fetch latest upstream commit
  case "$BASE_URL" in
    *gome.*)    BRANCH="gome" ;;
    *release.*) BRANCH="release" ;;
    *develop.*) BRANCH="develop" ;;
    *neo.*)     BRANCH="neo" ;;
    *)          BRANCH="main" ;;  # app.shapeshift.com or unknown
  esac
  git -C "$WEB_REPO" fetch origin "$BRANCH" --quiet 2>/dev/null
  COMMIT=$(git -C "$WEB_REPO" rev-parse "origin/$BRANCH" 2>/dev/null || echo "unknown")
fi

COMMIT_SHORT="${COMMIT:0:7}"
BRANCH_URL="https://github.com/$GITHUB_REPO/tree/$BRANCH"
COMMIT_URL="https://github.com/$GITHUB_REPO/commit/$COMMIT"
```

The dashboard auto-generates GitHub permalinks from `prBranch` and `commitSha`:
- Branch → `https://github.com/shapeshift/web/tree/<branch>`
- Commit → `https://github.com/shapeshift/web/commit/<sha>`

### 5. Create a run

**IMPORTANT**: Always pass the full (not short) commit SHA so the dashboard permalink works.

```bash
RUN_ID=$(curl -s -X POST "$QABOT/api/runs" \
  -H "Authorization: Bearer $QABOT_API_KEY" \
  -H "X-Qabot-Operator: $QABOT_OPERATOR" \
  -H "Content-Type: application/json" \
  -d '{"triggerType":"manual","fixtureFile":"<top-level-fixture>.yaml","url":"'"$BASE_URL"'","prBranch":"'"$BRANCH"'","commitSha":"'"$COMMIT"'"}' \
  | jq -r '.id')

# URL is a run-level arg, NOT per-fixture. Fixtures define a `route` (e.g. /trade).
# The full URL = $BASE_URL + fixture route.
# For local dev: BASE_URL=http://localhost:3000
# For staging: BASE_URL=https://gome.shapeshift.com or https://release.shapeshift.com
#
# For PR runs, also add: prNumber, prTitle, triggerType: "pr"
# For release runs, add: releaseTag, triggerType: "release"
# For cron/clawdbot runs, use: triggerType: "cron"
```

### 6. Mark run as running

Before executing any steps, transition the run from `pending` to `running`:

```bash
curl -s -X PATCH "$QABOT/api/runs/$RUN_ID" \
  -H "Authorization: Bearer $QABOT_API_KEY" -H "X-Qabot-Operator: $QABOT_OPERATOR" \
  -H "Content-Type: application/json" \
  -d '{"status":"running"}'
```

Run lifecycle: `pending` (created) -> `running` (agent-browser starts) -> `passed`/`failed` (all steps done)

### 7. Execute fixture steps (one at a time)

**CRITICAL**: Process each step individually. After each step: take a screenshot and push the result immediately via the batch endpoint. Do NOT batch all results at the end.

```text
# Pre-write all click helpers to /tmp/ (see Tips > JS Eval section above)
# Record the run start time ONCE before the loop:
RUN_START_MS=$(python3 -c 'import time; print(int(time.time()*1000))')

For EACH step across all fixtures (index 0, 1, 2, ...):

  1. Execute the step's instruction via agent-browser commands
  2. Take a snapshot and evaluate the `expected` condition
  3. Determine status: "passed" if expected state is visible, "failed" if not
  4. Calculate ELAPSED time since run start (NOT per-step duration):
     ELAPSED_MS=$(($(python3 -c 'import time; print(int(time.time()*1000))') - RUN_START_MS))
  5. ALWAYS take a screenshot using ABSOLUTE path in /tmp/:
     agent-browser --session qabot screenshot "/tmp/step-$INDEX-<step-name-slug>.png"
  6. Push screenshot + result in ONE call via the batch endpoint:
     curl -s -X POST "$QABOT/api/runs/$RUN_ID/step-complete" \
       -H "Authorization: Bearer $QABOT_API_KEY" -H "X-Qabot-Operator: $QABOT_OPERATOR" \
       -F "stepIndex=$INDEX" \
       -F "name=<group> > <step name>" \
       -F "status=<passed|failed>" \
       -F "durationMs=$ELAPSED_MS" \
       -F "agentThought=<what you observed - user-facing QA language>" \
       -F "actionTaken=<what happened from user perspective>" \
       -F "file=@/tmp/step-$INDEX-<slug>.png" \
       -F "label=<step-name>"
     The server uploads the screenshot to Vercel Blob, inserts the result,
     and recalculates run counters - all in one request.
     On success, delete the local file: rm -f "/tmp/step-$INDEX-<slug>.png"
     If the step has no screenshot, omit the "file" and "label" fields.
  7. For failed steps, also add: -F "errorMessage=<what went wrong>"
     and optionally: -F "errorStack=<stack trace or agent-browser output>"
  8. If step failed and it's critical, you may stop early
```

**IMPORTANT**: `durationMs` for each step is the **total elapsed wall-clock time since the run started**, NOT the duration of that individual step. This captures agent thinking time between steps (which is significant). The dashboard shows these as cumulative timestamps so the last step's duration = total run duration.

This way the dashboard updates live as each step completes.

#### Step Naming Convention (Grouping)

The dashboard groups steps into collapsible sections using ` > ` as the separator. Use this convention in ALL step names:

- **Dependency fixture steps**: `<Fixture Name> > <step name>`
  - Example: `Wallet Health > Dismiss onboarding`
  - Example: `Wallet Health > Unlock wallet`
- **Template fixture steps** (multi-chain): `<Chain Name> > <step name>`
  - Example: `Ethereum > Navigate to asset page`
  - Example: `Bitcoin > Enter amount and confirm send`
- **Regular fixture steps**: `<Fixture Name> > <step name>`
  - Example: `ETH to FOX Swap > Select sell asset`

Multi-level nesting is supported by chaining separators:
- `Send Receive > Ethereum > Navigate to asset page` (3 levels)

Steps without ` > ` render flat (no grouping) for backwards compatibility.

**CRITICAL**: Always use ` > ` (space-arrow-space), never `: ` or ` - ` as group separators. The dashboard only recognizes ` > `.

### 8. Complete the run

```bash
STATUS="passed"  # or "failed" if any step failed
TOTAL_MS=$(($(python3 -c 'import time; print(int(time.time()*1000))') - RUN_START_MS))
curl -s -X PATCH "$QABOT/api/runs/$RUN_ID" \
  -H "Authorization: Bearer $QABOT_API_KEY" -H "X-Qabot-Operator: $QABOT_OPERATOR" \
  -H "Content-Type: application/json" \
  -d '{"status":"'"$STATUS"'","completedAt":"'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'","durationMs":'"$TOTAL_MS"'}'
```

### 9. Post PR comment (if PR run)

```bash
curl -s -X POST "$QABOT/api/github/comment" \
  -H "Authorization: Bearer $QABOT_API_KEY" -H "X-Qabot-Operator: $QABOT_OPERATOR" \
  -H "Content-Type: application/json" \
  -d '{"runId":"'"$RUN_ID"'"}'
```

## Available Fixtures

```bash
ls e2e/fixtures/*.yaml
```

## Agent Thought / Action Logging

For each step, capture:
- **agentThought**: Your reasoning about what you see and whether the expected condition is met
- **actionTaken**: The actual agent-browser commands you ran
- **errorMessage**: If the step failed, what went wrong
- **errorStack**: Any error output from agent-browser

This context shows up in the qabot dashboard and PR comments.
