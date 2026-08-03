# Canonical Examples

The in-repo swappers ARE the templates - every one follows the canonical context split, so copy
from a living implementation instead of frozen snippets (they can't drift). Pick by what your
swapper resembles:

## By overall shape

| Need | Copy from | Why |
| --- | --- | --- |
| The reference implementation | `AcrossSwapper` | Simplest full canonical shape (EVM + Solana, context fetches) |
| Deposit-to-address + provider order | `BobGatewaySwapper` | Order resolved ONCE up front into a discriminated `{type:'rate'} \| {type:'quote'; orderResponse}` value; multi-namespace switch |
| Multi-namespace (evm/utxo/solana/tron) | `ButterSwap` | Single `switch (chainNamespace)` with BOTH arms inline per case; pure provider-fee fallback in helpers |
| Rate and quote hit DIFFERENT endpoints | `ZrxSwapper` | Context assembles but does NOT fetch - each wrapper fetches its own endpoint, hands a `NormalizedZrxQuote` to the context |
| Same endpoint, different params per arm | `PortalsSwapper` | Quote: real sender + validate:true + autoslippage retry; rate: dummy sender + validate:false |
| Two provider flows, one shape | `DebridgeSwapper` | Normalize-then-assemble: each flow maps its response to a shared `NormalizedDebridgeQuote`, context assembles once |
| Deposit channels / per-variant quotes | `ChainflipSwapper` | Context returns an ARRAY of contexts (regular+boost+DCA); channel creation is quote-wrapper-side |
| Gasless EIP-712 order | `CowSwapper` | `{type:'cowswap', chainId, orderToSign}` set at quote; `getUnsignedEvmMessage` thin reader; `executeEvmMessage` signs + POSTs |
| Sealed RFQ solana tx | `BebopSwapper` (solana arm) | `{type:'solana_serialized_tx', serializedTx}` - co-sign as-is, never rebuild |
| Multi-step provider routes | `RelaySwapper` | Per-step inputs from context; wrappers own the step map with fail-fast Result combining |
| Un-migrated chain namespace (fee-only) | `CetusSwapper` (sui), `StonfiSwapper` (ton), `AvnuSwapper` (starknet) | Full context split with no executable payload; exec re-derives |
| Migrated non-EVM chain | `SunioSwapper` (tron) | Real fee estimation + executable payload on a chain-specific variant |
| Shared thor-family internals | `utils/thorchain/` | Generic over two swappers + longtail two-phase rebuild |

## By specific mechanism

- **`assertValidTrade`** returning narrowed values: `AcrossSwapper/utils/helpers.ts`, `DebridgeSwapper` (returns both provider chain ids, killing double lookups)
- **`StepDataArgs` arm extras**: Chainflip (`{ depositAddress?: undefined }` rate / `{ depositAddress: string }` quote), ButterSwap (`buildTx` quote extra), Across (`{ from: string }` rate extra)
- **EVM fee + gasLimit invariant**: any EVM quote arm -> `getEvmNetworkFeeCryptoBaseUnit` (`utils/evm`)
- **Solana static compute limit**: `withComputeUnitLimit` call sites in Across/ButterSwap/Chainflip/NearIntents/Relay step data + their exported `[X]_SOLANA_COMPUTE_BUDGET` margins
- **UTXO fees + opReturn sizing**: `getUtxoNetworkFeeCryptoBaseUnit` (`utils/utxo`), ButterSwap utxo arm
- **SwapperMetadata union member + reads**: `ChainflipMetadata` (status polling by swap id), `NearIntentsMetadata` (deposit address for status + un-migrated exec), read via `getSwapMetadata`
- **checkTradeStatus with tracker links**: Chainflip (native id -> scan link), Relay (origin-tx link), CowSwapper (order uid link) - return `swapperTxId`/`swapperTxLink` constructed next to the provider response
- **HTTP service**: any `utils/[x]Service.ts` (`createCache` + `makeSwapperAxiosServiceMonadic`)
- **State-override gas estimation** (unapproved/unfunded sender still estimates): pass `stateOverride: { sellAsset, sellAmountCryptoBaseUnit, spenderAddress }` to `getEvmNetworkFeeCryptoBaseUnit` in the quote arm (`spenderAddress` = the step's `allowanceContract`, `''` when no approval is involved) — see ButterSwap/Portals/Relay step data; `utils/evm/stateOverride.ts` handles slot discovery

## Registration example (one line per swapper)

```typescript
// packages/swapper/src/constants.ts
import { acrossApi, acrossSwapper } from './swappers/AcrossSwapper'

export const swappers: Record<SwapperName, (SwapperApi & Swapper) | undefined> = {
  [SwapperName.Across]: { ...acrossSwapper, ...acrossApi },
  // ...
}
```
