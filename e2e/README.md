# qabot - E2E QA Testing

qabot is an AI-powered QA testing platform for ShapeShift Web. Operators (humans using Claude Code) run E2E test fixtures via `agent-browser` and post results to the qabot dashboard at https://qabot-kappa.vercel.app/.

The `/qabot` skill in Claude Code handles everything - executing fixtures, capturing screenshots, and uploading results.

## Setup

### 1. Environment Variables

You need three secrets and two config vars. We recommend keeping secrets in `~/.secrets` and sourcing that from your shell rc - keeps secrets out of dotfiles you might commit:

```bash
# ~/.secrets
export QABOT_API_KEY="<ask gomes for the shared key>"
export NATIVE_WALLET_PASSWORD="<your native wallet password>"
```

Then source it from `~/.zshrc` (or `~/.bashrc`):

```bash
# ~/.zshrc
[ -f ~/.secrets ] && source ~/.secrets
```

These two don't need to be in secrets - put them wherever you source env vars:

```bash
export QABOT_URL="https://qabot-kappa.vercel.app"
export QABOT_OPERATOR="<your-name>"  # e.g. "john", "clawdbot"
```

Summary:

| Variable | Required | Secret? | Description |
|---|---|---|---|
| `QABOT_API_KEY` | Yes | Yes | Shared API key for dashboard write access |
| `NATIVE_WALLET_PASSWORD` | Yes | Yes | Password for the native test wallet in agent-browser |
| `QABOT_URL` | Yes | No | Dashboard URL (default: `https://qabot-kappa.vercel.app`) |
| `QABOT_OPERATOR` | Yes | No | Your operator name - labels who ran the test |

### 2. agent-browser

[agent-browser](https://github.com/anthropics/agent-browser) is the headless browser automation tool that executes test steps.

```bash
npm install -g agent-browser
```

Requires v0.14.0+.

### 3. Wallet Profile Setup (one-time)

agent-browser stores wallet state per profile per origin. You need to import the native test wallet once for each origin you'll test against:

```bash
# Open a headed browser session
agent-browser --session qabot --profile ~/.agent-browser/profiles/qabot --headed open http://localhost:3000

# In the browser:
# 1. Create or import a native wallet
# 2. Set password to $NATIVE_WALLET_PASSWORD
# 3. Close the browser
```

Repeat for any other origin you want to test:

```bash
agent-browser --session qabot --profile ~/.agent-browser/profiles/qabot --headed open https://gome.shapeshift.com
agent-browser --session qabot --profile ~/.agent-browser/profiles/qabot --headed open https://release.shapeshift.com
```

After setup, the profile persists at `~/.agent-browser/profiles/qabot/` and subsequent runs reuse it.

### 4. ShapeShift Web Running

For local testing, start the dev server:

```bash
yarn dev
```

Or point `BASE_URL` at a staging environment:

```bash
BASE_URL=https://gome.shapeshift.com
```

## Running Tests

### Via Claude Code Skill

```
/qabot smoke-test.yaml
/qabot eth-to-fox-swap.yaml
/qabot evm-chains-regression.yaml
```

Or just `/qabot` for interactive mode - Claude will help you pick or craft a fixture.

### Available Fixtures

| Fixture | Description | Dependencies |
|---|---|---|
| `smoke-test.yaml` | Onboarding dismiss, wallet unlock, trade page verify | None |
| `eth-to-fox-swap.yaml` | Full ETH to FOX swap end-to-end | smoke-test |
| `thorchain-solana-swapper.yaml` | SOL/RUNE cross-chain swaps via THORChain | smoke-test |
| `evm-chains-regression.yaml` | $1 same-chain swaps across 7 EVM chains | smoke-test |

Fixtures live in `e2e/fixtures/`. Create new ones with `/qabot-fixture`.

## How It Works

1. The `/qabot` skill reads a YAML fixture and resolves dependencies
2. agent-browser opens a Chrome session with the test wallet profile
3. Each step is executed, verified via accessibility snapshots, and screenshotted
4. Screenshots are uploaded to the qabot dashboard (Vercel Blob storage)
5. Step results (pass/fail, agent observations, screenshots) are pushed per-step
6. The dashboard at https://qabot-kappa.vercel.app/ shows live progress

## Fixture Format

```yaml
name: My Test
description: What this tests
route: /trade
depends_on:
  - smoke-test.yaml       # runs BEFORE main steps
post_depends_on:
  - cleanup.yaml           # runs AFTER main steps
steps:
  - name: Do something
    instruction: >
      Natural language instruction for agent-browser.
      Click the swap button, type 1 in the amount field, etc.
    expected: What should be visible/true after this step
    screenshot: true
```

Dependencies are resolved recursively and deduplicated. All steps run in one browser session with continuous step indices.
