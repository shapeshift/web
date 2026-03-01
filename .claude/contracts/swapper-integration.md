# Contract: Swapper Integration

All integration points required when adding a new DEX aggregator, swapper, or bridge protocol to ShapeShift Web. This is the authoritative checklist - both build and review workflows reference this contract.

## Registration Checklist

Every new swapper must be registered in all of the following locations:

1. **SwapperName enum** - `packages/swapper/src/constants.ts`
   - Add enum entry: `[SwapperName] = '[Display Name]'`

2. **Swappers record** - `packages/swapper/src/constants.ts`
   - Register `{ swapper, swapperApi }` pair under `SwapperName.[SwapperName]`

3. **Default slippage** - `packages/swapper/src/constants.ts`
   - Add entry to `DEFAULT_SLIPPAGE_DECIMAL_PERCENTAGE_BY_SWAPPER`

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

10. **Export** - `packages/swapper/src/index.ts`
    - Export `[swapperName]Api` and `[swapperName]Swapper`

### If deposit-to-address model (Chainflip, NEAR Intents, etc.):

11. **TradeQuoteStep metadata** - `packages/swapper/src/types.ts`
    - Add `[swapperName]Specific` field to `TradeQuoteStep` type
    - Add to `SwapperSpecificMetadata` type

12. **Metadata wiring** - TWO places, BOTH required:
    - `src/components/MultiHopTrade/components/TradeConfirm/hooks/useTradeButtonProps.tsx` - Pass metadata from step to swap
    - `src/lib/tradeExecution.ts` - Pass metadata from step to swap

## Testing Checklist

### Automated Checks (MUST pass)
- [ ] `yarn type-check` - All type checks pass
- [ ] `yarn lint` - All lint checks pass
- [ ] `yarn build:swapper` - Swapper package builds
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

6. **Gas estimation** - Take max of API estimate and node estimate, add 15% buffer.

7. **Dummy address in executable quotes** - Block executable quotes when taker address is the dummy address used for rates.

8. **Response parsing** - Log actual API response and verify structure matches TypeScript types. Missing/renamed fields are common.

9. **Type safety** - Use `Address` and `Hex` types from viem, not bare strings.

10. **Error handling** - ALWAYS return `Result<T, SwapErrorRight>`, NEVER throw from quote/rate functions.

For detailed implementation patterns, see `.claude/skills/swapper-integration/SKILL.md`.
