# agent-browser E2E Testing

Runtime testing for Chainflip Lending UI using [agent-browser](https://github.com/vercel-labs/agent-browser).

## Setup

```bash
npm install -g agent-browser
agent-browser install
```

## Profile

A persistent browser profile at `~/.agent-browser/profiles/native` stores the native wallet (IndexedDB, localStorage, cookies). Import the wallet once in headed mode, then reuse across sessions.

```bash
# First time: headed, import wallet manually
agent-browser --session native --profile ~/.agent-browser/profiles/native --headed open http://localhost:3001

# Subsequent runs: headless or headed, profile persists
agent-browser --session native --profile ~/.agent-browser/profiles/native open http://localhost:3001
```

## Wallet Unlock

The native wallet requires a password on each session start. The password is read from `$NATIVE_WALLET_PASSWORD` (set in `~/.secrets`, sourced by `~/.zshrc`).

```bash
# Detect and unlock
SNAP=$(agent-browser --session native snapshot)
if echo "$SNAP" | grep -q "Enter Your Password"; then
  REF=$(echo "$SNAP" | grep 'textbox "Enter Password"' | grep -o '@e[0-9]*')
  agent-browser --session native fill "$REF" "$NATIVE_WALLET_PASSWORD"
  sleep 1
  NEXT=$(echo "$SNAP" | grep 'button "Next"' | grep -o '@e[0-9]*')
  agent-browser --session native click "$NEXT"
  sleep 5
fi
```

## Running

- **Headed** (visible browser, for first-time login or debugging): add `--headed`
- **Headless** (default, for CI/automated runs): omit `--headed`
- Always pass `--session native --profile ~/.agent-browser/profiles/native`
- Server must be running on `localhost:3001`

## Tips

- **Dismissing modals/overlays**: When transitioning between modals or tabs, click away from the current modal first (use `press "Escape"` or click on the page background). The cookie/tracking banner blocks clicks on underlying elements - dismiss it with `eval "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Got It')?.click()"` or by clicking `@ref` if not blocked.
- **Stubborn dialogs**: Some dialogs (e.g. Chakra `Dialog` without `closeOnOverlayClick`) won't close on Escape or overlay click. If a dialog is stuck, navigate away with `eval "window.location.hash = '/new-route'"` as a last resort.
- **Prefer `@ref` over text selectors**: Text selectors like `click "My Balances"` can timeout. Use `snapshot` to get refs, then `click "@e11"`.
- **`--profile` is first-launch only**: If the daemon is already running, `--profile` is ignored. Close the session first (`close`) then reopen with `--profile`.

## Key Commands

| Command | Description |
|---------|-------------|
| `open <url>` | Navigate to URL |
| `snapshot` | Accessibility tree with `@ref` element references |
| `click <text or @ref>` | Click element |
| `fill <text or @ref> <value>` | Clear and fill input |
| `screenshot [path]` | Take screenshot |
| `press <key>` | Press key (Escape, Enter, Tab) |
| `close` | Close browser |

## Screenshots

Screenshots are saved per-PR branch in `e2e/screenshots/<branch-name>/`.
