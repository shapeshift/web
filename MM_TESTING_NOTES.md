# MM Native Multichain - E2E Testing Notes

## Environment
- MetaMask v13.20.0 (prod)
- agent-browser session: qabot (headed, 2 tabs: tab 0 = localhost:3000, tab 1 = MM popup)
- Wallet: 0x5daf...61c986

## SOL Self-Send (flag ON) - PASS
- Amount: 0.001159151 SOL ($0.10)
- To: ETpdrE...CvWYLp (Account #0, self-send)
- Flow: SOL page > Send > Select Account #0 > Enter amount > Preview > Confirm > MM popup approve
- Result: SUCCESS - "You have successfully sent 0.001159151 SOL"
- Balance updated from 0.10131915 to 0.10131415 SOL
- Tx shows in history as "Today"

### Bugs Found & Fixed During SOL Testing

1. **solanaSendTx missing** - Chain adapter calls `wallet.solanaSendTx?.()` but native multichain wallet only had `solanaSignTx`. Added `solanaSendTx` using Wallet Standard `solana:signAndSendTransaction` feature.

2. **Uint8Array signature not encoded** - Wallet Standard returns `signature: Uint8Array` but chain adapter expects a base58 string. Added `bs58.encode(signature)` conversion.

3. **Modal reappears on reconnect** - Both `Connect.tsx` and `MipdBody.tsx` always navigate to `/metamask/native-multichain` when flag is on, without checking if user already chose. Fixed: check localStorage for `nativeMultichainPreference_{deviceId}` before navigating.

4. **shouldShowDeprecationModal race condition** - useEffect updates preference asynchronously but useMemo runs during render with stale null. Fixed: direct `getPreference(deviceId)` localStorage read inside useMemo as sync fallback.

### Struggles & Workarounds

- **agent-browser eval vs file eval**: Inline `eval 'expr'` works but `eval /tmp/file.js` throws SyntaxError on MetaMask extension pages (LavaMoat). Always use inline eval on the ShapeShift tab.
- **Tab switching**: MUST use `tab 0`/`tab 1` to switch between ShapeShift and MetaMask. Using `goto` to navigate to MM extension URL kills the ShapeShift page state (lost send dialogs multiple times).
- **MetaMask popup timing**: After clicking Confirm in ShapeShift, need ~2s delay before switching to tab 1 for MM to render the approval popup.
- **Click timeouts**: Some buttons (especially in modals) time out with `click @ref`. Workaround: use inline eval to find elements by text content and `.click()` programmatically.

## BTC (flag ON) - NOT AVAILABLE, GRACEFUL DEGRADATION
- MetaMask v13.20.0 only registers `solana:mainnet`, `solana:devnet`, `solana:testnet` via Wallet Standard
- No `bitcoin:` chains registered via Wallet Standard (even though MM shows BTC in its own UI)
- Dynamic detection works correctly: `_supportsBTC=false`, BTC not shown in native multichain modal
- BTC asset page loads fine with $0.00 balance, no crash
- Accounts tab: no Bitcoin chain listed (only ETH, SOL, and EVM chains)
- Swap page shows "No Bitcoin address found" message for BTC receive - expected behavior

## Tron (flag ON) - NOT AVAILABLE, NO dApp API
- MetaMask shows Tron natively in its UI (TRX $2.31, USDT $10.31 visible in MM popup)
- NOT exposed via Wallet Standard (no `tron:` chains registered)
- `wallet_createSession` (CAIP-25) returns "method does not exist / is not available"
- Conclusion: MetaMask Tron is UI-only, no programmable dApp API exists in prod v13.20.0
- Cannot implement Tron support until MetaMask ships a dApp-facing API for it

## Regression Testing (flag OFF) - PASS
- Toggled `VITE_FEATURE_MM_NATIVE_MULTICHAIN=false` in `.env.development`, waited for HMR
- Connected MetaMask via Connect Wallet > MetaMask > Pair
- **No native multichain modal appeared** - snap install modal showed instead
- Snap install modal shows correctly: "Multichain support is now available for MetaMask!" with "Add Snap" button
- All chain icons displayed (40+ chains supported by snap)
- "Don't ask again" checkbox present
- Zero regression: native multichain code paths not executed when flag OFF

## Regression Testing (flag ON, reconnect flow)
- Modal correctly skipped on reconnect when preference already stored
- Preference key: `nativeMultichainPreference_io.metamask:0x5daf...61c986` = `native`
