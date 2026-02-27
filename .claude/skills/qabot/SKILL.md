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
- **qabot API/dashboard**: `https://qabot-kappa.vercel.app`

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
  - smoke-test.yaml       # runs BEFORE main steps (wallet unlock etc.)
post_depends_on:
  - cleanup.yaml          # runs AFTER main steps (regression tests etc.)
steps:
  - name: Step name
    instruction: Natural language instruction for agent-browser
    expected: What should be true after this step
    screenshot: true  # optional, take screenshot after step
```

### Composability

Fixtures can declare `depends_on` (pre-dependencies) and `post_depends_on` (post-dependencies).

- `depends_on` - fixtures that run BEFORE the main steps (e.g. smoke-test, wallet unlock)
- `post_depends_on` - fixtures that run AFTER all main steps (e.g. regression tests, cleanup)
- Dependencies are resolved recursively and deduplicated (each fixture runs at most once)
- All fixtures run sequentially in one browser session - the page state carries over
- Step indices are continuous across all fixtures: [pre_deps, main_steps, post_deps]
- All steps from all fixtures go into a single qabot run
- The `fixtureFile` for the run is the top-level fixture name

Example: `1.1012.0.yaml` depends on `smoke-test.yaml` and post-depends on `evm-chains-regression.yaml`:
1. smoke-test runs first (7 steps: dismiss onboarding, unlock wallet, verify page)
2. 1.1012.0 main steps run next (second-class chain tests)
3. evm-chains-regression runs last (first-class EVM swap regression)
4. Step indices are continuous across all three

### Onboarding Dialog

On first visit to any origin (gome.shapeshift.com, release.shapeshift.com, etc.), ShapeShift shows an onboarding splash dialog ("Self-Custody", "You own your keys") with "Skip" and "Next" buttons. The smoke-test fixture handles dismissing this. Always run smoke-test as a dependency for other fixtures.

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

The native wallet requires a password on each session start. The smoke-test fixture handles this. If running without smoke-test, handle it manually:

1. Check for onboarding dialog first - click "Skip" if present
2. Look for "Enter Your Password" dialog
3. Click the wallet name button (e.g. "test", "teest") if wallet selection is shown
4. Click the password textbox
5. Type `$NATIVE_WALLET_PASSWORD` character by character using `press` (NOT `fill` - React controlled inputs need keypress events)
6. Click "Next"
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
- **Cookie/tracking banner**: On external origins, a cookie banner ("Our dApp uses anonymized click tracking...") appears with a "Got It" button. **Dismiss this immediately after page load** - it can block interactions. The smoke-test fixture should handle this.

#### Asset Picker

- **Asset picker multi-chain**: Assets like FOX exist on multiple chains. Clicking the asset button once expands to show chain variants - click the specific chain variant (e.g. "Ethereum (FOX)") from the expanded list. Primary assets like SOL, BTC, RUNE don't need expansion.
- **Opening the asset picker**: Focus the asset avatar button via JS eval, then send Enter via `agent-browser press Enter`. Example:
  ```bash
  printf 'var btn=document.querySelector("[data-testid=sell-asset-avatar]"); if(btn) btn.focus();' > /tmp/focus-sell-avatar.js
  agent-browser --session qabot eval "$(cat /tmp/focus-sell-avatar.js)"
  agent-browser --session qabot press Enter
  ```
- **Chain filter**: Click the "All" button next to the search input to open the network dropdown, then select the desired chain via its menuitem role. Example:
  ```bash
  printf 'var btn=document.querySelector("button[role=menuitem]"); var items=document.querySelectorAll("[role=menuitem]"); for(var i=0;i<items.length;i++){if(items[i].textContent.includes("Ethereum")){items[i].click();break;}}' > /tmp/select-chain.js
  agent-browser --session qabot eval "$(cat /tmp/select-chain.js)"
  ```
- **Selecting an asset from search results**: Portal-rendered asset picker buttons don't respond to JS `.click()`. Instead, find the button via JS eval, get its bounding rect coordinates, then use mouse commands:
  ```bash
  # Get coordinates of the target asset button
  printf 'var btns=document.querySelectorAll("button"); for(var i=0;i<btns.length;i++){if(btns[i].textContent.includes("FOX")&&btns[i].textContent.includes("Ethereum")){var r=btns[i].getBoundingClientRect();JSON.stringify({x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)})}}' > /tmp/get-asset-coords.js
  # Then click at those coordinates
  agent-browser --session qabot mouse move X Y && agent-browser --session qabot mouse down && agent-browser --session qabot mouse up
  ```
- **Popular bar pills are NOT selectors**: The popular asset pills at the top of the picker (ETH, USDT, etc.) are quick-filter shortcuts that filter the search results - they are NOT clickable asset selectors. You still need to click the actual asset button from the filtered results below.
- **Switch Assets is unreliable after swaps**: After completing a swap, the "Switch Assets" button may not reverse assets. Always verify via snapshot after clicking. If it didn't work, fall back to manually selecting assets via the pickers.

#### Screenshots

- **Always use absolute paths for screenshots**: Use `/tmp/step-N-name.png`, NOT relative paths. Relative paths cause resolution issues between agent-browser's cwd and the shell's cwd. `curl -F file@...` will fail with exit code 26 if the path is wrong.
  ```bash
  agent-browser --session qabot screenshot "/tmp/step-0-dismiss-onboarding.png"
  ```
- **Screenshots are temporary**: Screenshots are saved to `/tmp/` only as a temp step before uploading to Vercel Blob. After uploading, `rm` the local file. Do NOT accumulate local screenshots.
- **Verify upload before deleting**: Always check the upload response contains a valid blob URL BEFORE deleting the local file. Pattern:
  ```bash
  RESPONSE=$(curl -s -X POST "$QABOT/api/runs/$RUN_ID/screenshots" ...)
  SHOT_URL=$(echo "$RESPONSE" | jq -r '.url')
  if [ -n "$SHOT_URL" ] && [ "$SHOT_URL" != "null" ]; then rm -f /tmp/step-N-name.png; fi
  ```
- **Screenshots timing**: Always take screenshots AFTER verifying the expected state via snapshot, not before. Early screenshots capture intermediate states.
- **One screenshot per verification**: Never combine two major checks (e.g. balance check + Tx history) into one step with one screenshot. Each verification gets its own dedicated step and screenshot.
- **Balance before/after**: Before a swap, note the target asset balance. After the swap completes, screenshot the Accounts tab showing the chain -> Account 0 -> per-asset balance. Include "balance before -> after" in the step name and report (e.g. "verify FOX balance 12.5 -> 24.8").
- **Dismiss notifications immediately**: Close swap completion toast notifications as soon as they appear - don't leave them lingering. They can obscure UI elements and pollute screenshots.

#### Agent Thought / Action Logging

- **Agent thoughts must be user-facing**: `agentThought` and `actionTaken` fields in results should read like a QA engineer's notes, NOT implementation details. Write "Focused password input, typed password" not "JS eval to focus input, press chars one by one". Describe what happened from a user's perspective, not the automation method used.

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

#### Shell & Environment

- **zsh gotchas**: `$VAR` as command doesn't work in zsh. `!` negation in inline scripts causes "command not found: !". Use `grep -v` or numeric comparison instead. macOS `date` doesn't support `%3N` for milliseconds - use `python3 -c 'import time; print(int(time.time()*1000))'`. `status` is a read-only variable in zsh - use `result_status` instead.
- Use `snapshot` after every action to verify state
- Close the session when done: `agent-browser --session qabot close`
- External origins (gome, release) are slower than localhost - use longer waits (8-10s after wallet unlock)

## Execution Flow

### 1. Set up auth

```bash
source ~/.secrets
QABOT="${QABOT_URL:-https://qabot-kappa.vercel.app}"
BASE_URL="${BASE_URL:-http://localhost:3000}"
```

All write requests use:
- `Authorization: Bearer $QABOT_API_KEY`
- `X-Qabot-Operator: $QABOT_OPERATOR`

### 2. Resolve fixture dependencies

```bash
# Read the fixture YAML
# If depends_on is present, load each pre-dependency recursively
# If post_depends_on is present, load each post-dependency recursively
# Deduplicate (each fixture runs once even if referenced multiple times)
# Build ordered list: [pre_dep_steps, ..., main_fixture_steps, ..., post_dep_steps]
# Step indices are continuous: 0, 1, 2, ... across all fixtures
```

### 3. Create a run

Always capture the current branch and commit hash:

```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
COMMIT=$(git rev-parse --short HEAD)

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

### 4. Mark run as running

Before executing any steps, transition the run from `pending` to `running`:

```bash
curl -s -X PATCH "$QABOT/api/runs/$RUN_ID" \
  -H "Authorization: Bearer $QABOT_API_KEY" -H "X-Qabot-Operator: $QABOT_OPERATOR" \
  -H "Content-Type: application/json" \
  -d '{"status":"running"}'
```

Run lifecycle: `pending` (created) -> `running` (agent-browser starts) -> `passed`/`failed` (all steps done)

### 5. Execute fixture steps (one at a time)

**CRITICAL**: Process each step individually. After each step: take a screenshot, upload it, then push that step's result immediately. Do NOT batch all results at the end.

```
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
  6. Upload the screenshot, verify response, then delete local file:
     RESPONSE=$(curl -s -X POST "$QABOT/api/runs/$RUN_ID/screenshots" \
       -H "Authorization: Bearer $QABOT_API_KEY" -H "X-Qabot-Operator: $QABOT_OPERATOR" \
       -F "file=@/tmp/step-$INDEX-<slug>.png" \
       -F "label=<step-name>")
     SHOT_URL=$(echo "$RESPONSE" | jq -r '.url')
     if [ -n "$SHOT_URL" ] && [ "$SHOT_URL" != "null" ]; then rm -f "/tmp/step-$INDEX-<slug>.png"; fi
  7. Push this step's result immediately:
     curl -s -X POST "$QABOT/api/runs/$RUN_ID/results" \
       -H "Authorization: Bearer $QABOT_API_KEY" -H "X-Qabot-Operator: $QABOT_OPERATOR" \
       -H "Content-Type: application/json" \
       -d '{"results":[{
         "stepIndex": $INDEX,
         "name": "<fixture-name>: <step name>",
         "status": "<passed|failed>",
         "durationMs": '"$ELAPSED_MS"',
         "agentThought": "<what you observed - user-facing QA language>",
         "actionTaken": "<what happened from user perspective>",
         "screenshots": [{"url": "'"$SHOT_URL"'", "label": "<step-name>"}]
       }]}'
  8. If step failed and it's critical, you may stop early
```

**IMPORTANT**: `durationMs` for each step is the **total elapsed wall-clock time since the run started**, NOT the duration of that individual step. This captures agent thinking time between steps (which is significant). The dashboard shows these as cumulative timestamps so the last step's duration = total run duration.

This way the dashboard updates live as each step completes (auto-refreshes every 10s).

### 6. Complete the run

```bash
STATUS="passed"  # or "failed" if any step failed
TOTAL_MS=$(($(python3 -c 'import time; print(int(time.time()*1000))') - RUN_START_MS))
curl -s -X PATCH "$QABOT/api/runs/$RUN_ID" \
  -H "Authorization: Bearer $QABOT_API_KEY" -H "X-Qabot-Operator: $QABOT_OPERATOR" \
  -H "Content-Type: application/json" \
  -d '{"status":"'"$STATUS"'","completedAt":"'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'","durationMs":'"$TOTAL_MS"'}'
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

This context shows up in the qabot dashboard.
