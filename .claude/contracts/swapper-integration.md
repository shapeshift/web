# Contract: Swapper Integration

All integration points required when adding a new DEX aggregator, swapper, or bridge protocol to ShapeShift Web. This is the authoritative checklist - both build and review workflows reference this contract.

## Registration Checklist

Every new swapper must be registered in all of the following locations:

1. **SwapperName enum** - `packages/swapper/src/types.ts`
   - Add enum entry: `[SwapperName] = '[Display Name]'`

2. **Swappers record** - `packages/swapper/src/constants.ts`
   - One barrel import per swapper; register `{ ...[swapperName]Swapper, ...[swapperName]Api }` under `SwapperName.[SwapperName]`

3. **Default slippage** - `packages/swapper/src/constants.ts`
   - Add a case to `getDefaultSlippageDecimalPercentageForSwapper` if it differs from the default

4. **CSP headers** - `headers/csps/defi/swappers/[SwapperName].ts`
   - All external API domains in `connect-src`
   - Registered in `headers/csps/index.ts`

5. **Feature flag** - Multiple files:
   - `src/state/slices/preferencesSlice/preferencesSlice.ts` - `FeatureFlags` type + initial state
   - `src/config.ts` - `VITE_FEATURE_[SWAPPER]_SWAP` validation
   - `.env` / `.env.development` / `.env.production` - Default values
   - `src/test/mocks/store.ts` - Mock default

6. **State helpers** - `src/state/helpers.ts`
   - `getEnabledSwappers()` - Add feature flag destructure + swapper entry
   - `isCrossAccountTradeSupported()` - Add case returning true/false

7. **Swapper icon** - `src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/`
   - Icon image file (128x128+ PNG)
   - Case in `SwapperIcon.tsx` returning the image

8. **Environment variables** - `.env`, `.env.development`, `.env.production`
   - `VITE_[SWAPPER]_API_KEY` (if authenticated)
   - `VITE_FEATURE_[SWAPPER]_SWAP`

9. **SwapperConfig type** - `packages/swapper/src/types.ts`
   - Add `VITE_[SWAPPER]_API_KEY` (and any other config fields)

10. **Barrel + export** - swapper `index.ts` exports `{ [swapperName]Api, [swapperName]Swapper }` at minimum; root `packages/swapper/src/index.ts` re-exports the swapper directory

11. **Canonical structure** - the swapper follows the context split (`utils/helpers.ts` pure, `utils/get[X]TradeContext.ts` shared core with zero quoteOrRate checks, `utils/get[X]StepData.ts` discriminated + overloaded + no-throw, thin `getTradeQuote`/`getTradeRate` wrappers returning `Trade[]`) with scoped `[X]Trade{Quote,Rate}Input` aliases cast at the endpoint boundary. Rubric: `.claude/skills/swapper-rate-quote-review/SKILL.md`

### If status/execution needs provider tracking data (deposit address, order/swap id):

12. **SwapperMetadata union** - `packages/swapper/src/types.ts`
    - Add a `[Swapper]Metadata` member (`{ name: '[swapperName]', ... }`) to the `SwapperMetadata` union; set `step.swapperMetadata` at quote time; read via `getSwapMetadata(...)` in `checkTradeStatus`/execution. NO web-side wiring - `buildSwapMetadata` carries it automatically

### Public API + swap widget (separate, deliberate decisions):

13. **Public api enablement** - add to `ENABLED_SWAPPER_NAMES` (`packages/public-api/src/constants.ts`) only after verifying the quote's `transactionData` variant is serialized by `extractTransactionData.ts` + the zod schemas

14. **Swap widget enablement** - the widget's restricted `SwapperName` enum (`packages/swap-widget/src/types/index.ts`) is its allowlist; add icon/color entries in `constants/swappers.ts` if enabling

## Testing Checklist

### Automated Checks (MUST pass)
- [ ] `npx tsc --noEmit -p packages/swapper/tsconfig.esm.json` passes (the root `-p packages/swapper` solution config checks ZERO files - never trust it)
- [ ] `pnpm run lint` - All lint checks pass
- [ ] `pnpm run build:swapper` - Swapper package builds
- [ ] No `any` types used
- [ ] All errors handled monadically (`Result<T, SwapErrorRight>`)

### Manual Testing
- [ ] Can fetch quotes for supported chains
- [ ] Rates display without wallet connected
- [ ] Approval flow works (if needed)
- [ ] Transaction execution succeeds
- [ ] Native token swaps work (ETH to USDC, USDC to ETH)
- [ ] Wrapped token swaps work (WETH to USDC)
- [ ] Error handling works (unsupported chain, insufficient liquidity)
- [ ] UI shows swapper icon correctly
- [ ] Feature flag toggles swapper on/off
- [ ] Cross-account trades work (if supported)
- [ ] Rate vs quote delta < 0.1%
- [ ] Status polling works (if applicable - deposit-to-address model)

### Edge Cases
- [ ] Very small amounts (near minimum)
- [ ] Very large amounts (near maximum)
- [ ] High slippage scenarios
- [ ] Low liquidity pairs
- [ ] Gas price spikes
- [ ] API timeouts/errors

## Common Gotchas

These are the most frequent bugs in swapper integrations. Check each one proactively:

1. **Slippage format mismatch** - ShapeShift uses decimal (0.005 = 0.5%). APIs may expect percentage (0.5), basis points (50), or decimal (0.005). Verify against API docs.

2. **Address checksumming** - Many APIs require EIP-55 checksummed addresses. Use `getAddress()` from viem before sending to API.

3. **Hex conversion** - API returns hex for `tx.value`, `tx.gas`, `tx.gasPrice`. Convert with `fromHex()` from viem before using as decimal strings.

4. **Affiliate fee delta** - Pass the same `affiliateBps` to BOTH quote and rate endpoints. Different affiliate amounts cause rate vs quote mismatch.

5. **Native token marker** - Verify the marker address matches what the API expects (commonly `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE`).

6. **EVM gasLimit invariant** - every EVM quote's `transactionData.gasLimit` ends up set: route ALL EVM fee math through `getEvmNetworkFeeCryptoBaseUnit` (prices provider gas as-is, or estimates-and-sets the buffered limit in place). Quotes hard-fail on estimation failure; only rates fall back to the provider fee.

7. **Dummy address in executable quotes** - Block executable quotes when taker address is the dummy address used for rates.

8. **Response parsing** - Log actual API response and verify structure matches TypeScript types. Missing/renamed fields are common.

9. **Type safety** - Use `Address` and `Hex` types from viem, not bare strings.

10. **Error handling** - ALWAYS return `Result<T, SwapErrorRight>`, NEVER throw from quote/rate/step-data/context functions. Estimation failures on the quote arm use `makeNetworkFeeEstimationFailedErr`; unbuildable provider payloads use `makeTradeStepBuildFailedErr`.

11. **Rate steps carry the wallet's accountNumber** - propagate `input.accountNumber` (undefined only when walletless); never hardcode `accountNumber: undefined`. Rates never carry `transactionData`.

12. **Quote addresses** - `assertQuoteAddresses(input)` before any provider request; rate-only address defaults must never leak into quotes.

For detailed implementation patterns, see `.claude/skills/swapper-integration/SKILL.md`.
