# Garden Swapper Integration

## Overview

- **Website**: https://garden.finance
- **API Docs**: https://docs.garden.finance
- **Type**: Deposit-to-address cross-chain (HTLC + intent solvers)
- **MVP scope**: BTC ↔ strkBTC only

The Garden integration runs on the same deposit-to-address shape as
`NearIntentsSwapper` (`getTradeQuote` resolves to a deposit address that the
user funds via `executeUtxoTransaction` or `executeStarknetTransaction`).
Status is polled via `GET /v2/orders/{id}`.

## Why only BTC ↔ strkBTC

Garden's `/policy` endpoint explicitly blacklists every `starknet:strkbtc`
pair except `bitcoin:btc` as of strkBTC launch (May 2026). This is enforced
locally in `utils/helpers/helpers.ts → isSupportedGardenPair`, with the
remote `/policy` errors mapped to `TradeQuoteError.NoRouteFound`.

## API Details

- **Base URL**: `https://api.garden.finance/v2`
- **Authentication**: `garden-app-id` header (get a key from
  https://portal.garden.finance)
- **Endpoints used**:
  - `GET /quote` — indicative + binding quote, supports `affiliate_fee` (bps)
  - `POST /orders` — creates an order, returns chain-specific initiate data
  - `GET /orders/{order_id}` — status polling
  - `GET /apps/earnings` — affiliate earnings (DAO ops, weekly batch claim)

## Response shapes (verified live via curl spike)

### `GET /quote`
```json
{
  "status": "Ok",
  "result": [{
    "source":      { "asset": "starknet:strkbtc", "amount": "100000", ... },
    "destination": { "asset": "bitcoin:btc",      "amount": "99150",  ... },
    "solver_id": "0xa3c4b7f912e8f56d9b2a1ec44b0c578a9fe12c8d",
    "estimated_time": 20,
    "slippage": 0,
    "fee": 30,
    "fixed_fee": "0"
  }]
}
```

Per the Garden OpenAPI spec (`docs.garden.finance/api-reference/openapi.json`):
- `fee` (integer) — **In BIPS**, where 100 bips = 1%
- `fixed_fee` (string) — **In USD** (decimal string)
- `slippage` (integer) — **In BIPS**
- `estimated_time` (integer) — In seconds

### `POST /orders` — Bitcoin source
```json
{
  "status": "Ok",
  "result": {
    "order_id": "...",
    "to": "bc1p0ndhv28j3qsw3vhevj2lkw9phhyyqayjxn7we3fln9z9gq9h208sm20qrh",
    "amount": "100000"
  }
}
```

### `POST /orders` — Starknet source
```json
{
  "status": "Ok",
  "result": {
    "order_id": "...",
    "approval_transaction": { "to": "<strkBTC token>", "selector": "0x219...", "calldata": ["<HTLC>", "0xffff...", "0xffff..."] },
    "initiate_transaction": { "to": "<HTLC>", "selector": "0x2aed...", "calldata": [...] },
    "typed_data": { /* SNIP-12 — unused, we submit the direct multi-call */ }
  }
}
```

## Fee model (verified against `api.garden.finance` live)

Garden returns **two additive fee components per route**, both set by the
winning solver:

- `fee` (BIPS) — percentage cut on the destination amount
- `fixed_fee` (USD string) — fixed amount added on top

Effective fee = `amount × fee/10000 + fixed_fee_in_destination_units`.

The split varies per route (solver competition + destination-chain gas
cost + asset liquidity premium). Snapshot 2026-05-15:

| Route | `fee` | `fixed_fee` | Effective on $1,558 trade |
| --- | --- | --- | --- |
| `BTC → strkBTC` | 30 bps | $0 | $4.68 (30 bps) |
| `BTC → cbBTC.base` | 21 bps | $0 | $3.27 (21 bps) |
| `BTC → WBTC.eth` | 0 bps | $2 | $2.00 (13 bps) |
| `WBTC.eth → cbBTC.base` | 35 bps | $2 | $7.46 (48 bps) |

Values are not hard-coded by Garden — they reflect solver economics
(capital lockup during HTLC settlement, destination-chain gas absorption,
inventory premium for new assets). They drift over time as liquidity
shifts.

This fee is **already baked into the displayed rate** (`destination.amount`
is the net amount the user receives). The ShapeShift `protocolFees` field
on `TradeQuoteStep` surfaces only the affiliate cut on top, not Garden's
own fee — mirroring the AvnuSwapper convention.

## Implementation notes

### Slippage format
Garden uses **bps integer**, where 100 bps = 1%. ShapeShift internal is
decimal (0.005 = 0.5%). Conversion in `slippageDecimalToBps` (`helpers.ts`).

### Affiliate fee
Two fields:
- `affiliate_fee=N` as a **query string int** on `GET /quote`
- `affiliate_fees: [{ asset, address, fee }]` as a **JSON array** on
  `POST /orders`

Both MUST be passed in tandem to avoid the rate ↔ quote delta gotcha
(see `.claude/skills/swapper-integration/common-gotchas.md` §6).

### Affiliate fee asset constraint
Garden only accepts a restricted set of `(asset, address)` pairs as the
fee recipient. We verified the live API matrix during the spike:

| Asset | Status |
| --- | --- |
| `base:cbbtc` | ✅ works |
| `ethereum:cbbtc` | ✅ works |
| `ethereum:usdc` | ✅ works |
| `base:usdc` | ❌ rejected |
| `arbitrum:usdc` | ❌ rejected |
| `arbitrum:cbbtc` | ❌ rejected |

We use `base:cbbtc` → `DAO_TREASURY_BASE` to keep the fee BTC-denominated
and avoid the higher withdraw friction of Ethereum mainnet. The published
OpenAPI enum lists 6 options — only 3 actually accept on mainnet.

### Affiliate fee distribution
Garden distributes affiliate fees **weekly**, batched, via an on-chain
claim transaction on the distributor contract. Treasury ops need to
periodically:
1. Call `GET /apps/earnings` to get claimable amounts
2. Submit a claim tx on the distributor contract

This is treasury-side work, not part of the swapper itself.

### Solver ID requirement
`POST /orders` requires `solver_id` from the quote. Omitting it returns
`"Invalid strategy id"`. We fetch a fresh quote inside `getTradeQuote` and
pass `quote.solver_id` to the order request.

### Destination amount must match
`destination.amount` on `POST /orders` MUST equal the quote's destination
amount exactly, otherwise the order is rejected. We use
`quote.destination.amount` verbatim.

### Bitcoin source flow
The order response gives a `to` field — a P2TR (Pay-to-Taproot) script
address. We send a UTXO transaction to this address via
`executeUtxoTransaction`. ShapeShift's UTXO adapter handles P2TR correctly
(NEAR Intents uses the same pattern).

### Starknet source flow
The order response gives `approval_transaction` and `initiate_transaction`
with pre-built calldata. We combine these into a single Starknet INVOKE
transaction (multi-call), mirroring `AvnuSwapper.getUnsignedStarknetTransaction`.

Garden returns selectors pre-hashed, so we do NOT call
`hash.getSelectorFromName(entrypoint)` like AvnuSwapper — we use the
selector strings as-is.

### Status mapping
Garden does not expose a single canonical status enum at the order level.
We derive the ShapeShift `TxStatus` from the order shape:
- `destination_swap.redeem_tx_hash` populated → `Confirmed`
  (use that hash as `buyTxHash`; `filled_amount` becomes
  `actualBuyAmountCryptoBaseUnit`)
- `source_swap.refund_tx_hash` or `destination_swap.refund_tx_hash` populated
  → `Failed` with "Swap refunded"
- Otherwise → `Pending`

The Garden docs' definition matches: *"The swap is complete once the
`order.destination_swap.redeem_tx_hash` field is populated."*

### Quote staleness
Garden quotes expire — the underlying HTLC `timelock` (per-swap) is
short (typically minutes-to-hours). Order creation happens inside
`getTradeQuote` to minimise the gap between quote and on-chain
initiate. If the user delays past the HTLC timeout, the solver will
issue a `refund_tx_hash` and our status mapping surfaces it as
`Failed`.

### Min / max amounts and liquidity caps

There are **two independent caps** on a Garden swap, both enforced by the
quote endpoint:

1. **Per-asset hard min / max** from `GET /v2/assets`. Static, encoded
   in the asset config. Examples (snapshot 2026-05-15):
   - All BTC-pegged assets (`btc`, `wbtc`, `cbbtc`, `btcb`, `strkbtc`,
     `ubtc`, `btc.b`): `0.0001` → `5` units (~$8 → ~$395k)
   - `litecoin:ltc`: `0.01` → `6,500` LTC (~$0.57 → ~$372k)
   - Stablecoins (`usdc`, `usdt`): `10` → `450,000` units (~$10 → ~$450k)
   - `solana:sol`: `0.1` → `3,500` SOL (~$9 → ~$313k)
   - `monad:mon`: `470` → `20,000,000` MON
   Out-of-range requests return `"expected amount to be within the range
   of X to Y"`, mapped to `TradeQuoteError.SellAmountBelowMinimum`.

2. **Per-route solver liquidity cap** from `GET /v2/liquidity`. Dynamic,
   refreshed continuously. Garden returns one entry per (solver, asset)
   pair with `balance` / `virtual_balance` / `fiat_value`. The route
   `bitcoin:btc → X` is capped by the total destination-side `X`
   liquidity across all solvers. When the request exceeds it, the quote
   endpoint returns `"insufficient liquidity"`, which we map to
   `TradeQuoteError.NoRouteFound` so the UI prompts the user to retry
   with a smaller amount. Snapshot of available destination liquidity at
   integration time:

   | Destination asset | Available | Solvers |
   | --- | ---: | ---: |
   | `bitcoin:btc` | $1,472,534 | 4 |
   | `ethereum:cbbtc` | $316,447 | 1 |
   | `ethereum:wbtc` | $313,110 | 2 |
   | `base:cbbtc` | $215,562 | 3 |
   | `litecoin:ltc` | $127,749 | 1 |
   | `arbitrum:ibtc` | $86,223 | 1 |
   | `solana:cbbtc` | $79,114 | 1 |
   | `bnbchain:btcb` | $74,440 | 2 |
   | `starknet:strkbtc` | $70,345 | 1 |
   | `starknet:wbtc` | $9,660 | 1 |
   | `arbitrum:wbtc` | **$71** | 1 |
   | `monad:mon` | **$36** | 1 |

   Boundary tests (BTC source, in BTC):
   - `BTC → ethereum:cbbtc`: OK at 4 BTC ($316k), fails at 4.5 BTC
   - `BTC → starknet:strkbtc`: OK at 0.8 BTC ($63k), fails at 0.9 BTC
   - `BTC → arbitrum:wbtc`: only 0.0001 BTC ($8) works (~$71 cap)

   For the reverse direction (sell), the cap follows the destination
   side. `strkbtc → btc` works only up to ~0.01 strkBTC at the time of
   integration despite Bitcoin having $1.47M total — solver-specific
   per-swap caps come into play for the smaller side.

The integration does **not** pre-fetch `/v2/liquidity` to enforce caps
client-side. We rely on Garden's `/quote` endpoint as the source of
truth and surface its errors via `TradeQuoteError.NoRouteFound`. To
sanity-check live caps without firing a swap:

```bash
curl -sL "https://api.garden.finance/v2/liquidity" \
  -H "garden-app-id: $YOUR_APP_ID" | jq '.result[].liquidity'
```

## Trust & security context

Garden had a ~$10M solver-layer exploit on 2025-10-30. Per Garden's
post-mortem (with EY) the protocol's HTLC contracts were not compromised
— solver and user funds are architecturally separated, and no user funds
were affected by the exploit. Trail of Bits has audited the contracts
(Nov 2025).

Pre-hack, ZachXBT publicly raised concerns about volume composition.
We surface these in the integration PR description so DAO/governance
can sign off explicitly.

Garden's other integrators today include Coinbase, MetaMask, Phantom,
Robinhood Wallet, Kraken, and Ledger (~$2B+ cumulative volume per
`docs.garden.finance/llms.txt`). LI.FI's aggregator also includes
Garden (verified via `https://li.quest/v1/tools`).

## Known gotchas

1. **OpenAPI enum is stale**: at the time of integration, Garden's
   published OpenAPI Asset enum did not include `starknet:strkbtc`. We
   type the asset list manually. Re-pulling generated types from
   `api-reference/openapi.json` will not detect strkBTC support.

2. **Affiliate fee asset rejection messages** are misleading: the error
   `"Asset 'base:0x5fa58e...' not found"` is returned when the affiliate
   fee `asset` field is one of the rejected entries (e.g. `base:usdc`).
   Use `base:cbbtc` to avoid this.

3. **`solver_id` is required on order creation** despite being marked
   optional in the OpenAPI spec.

4. **Starknet address normalization** is required (`validateAndParseAddress`
   from `starknet.js`). The address that Garden returns for the strkBTC
   token has a missing leading zero relative to the canonical form
   (`0x787150...` vs `0x0787150...`). Always normalize.

## Local end-to-end testing with Merry

Garden ships a Docker-based localnet (`merry`) that includes a Bitcoin
regtest node, EVM localnet (Ethereum + Arbitrum), a simulated solver, a
local orderbook, and a faucet. It does **not** include Starknet, so
strkBTC ↔ BTC specifically can only be exercised on mainnet. Merry is
still useful to validate the deposit-to-address flow, status polling,
and affiliate fee plumbing against a non-production environment by using
BTC ↔ Eth/Arb routes, which share the same code path.

```bash
# Install (Docker required)
curl https://get.merry.dev | bash

# Start everything (Bitcoin regtest, EVM nodes, orderbook, filler)
merry go

# Endpoints:
#   Bitcoin RPC      localhost:18443
#   Ethereum RPC     localhost:8545
#   Arbitrum RPC     localhost:8546
#   Orderbook API    localhost:8080
#   Bitcoin explorer localhost:5050
#   Ethereum explorer localhost:5100

# Fund a test address
merry faucet --to <address>

# Tail solver logs while running test swaps
merry logs -s filler

merry stop -d   # tear down + delete state
```

To point the swapper at the local orderbook, override
`GARDEN_API_BASE_URL` to `http://localhost:8080` in the constants file
during local test runs (do not commit that change).

## Required follow-ups before enabling in production

- [ ] Stand up the weekly affiliate fee claim workflow (DAO ops, off-code)
- [ ] Manual mainnet test ~$20 in each direction
- [ ] Set `VITE_FEATURE_GARDEN_SWAP=true` in `.env.production` only after
  governance sign-off given Garden's history (see PR description)

## Local build prerequisite

`pnpm run build:packages` indirectly invokes `openapi-generator-cli`
(via `unchained-client`), which is a Node wrapper around a JDK tool.
On macOS, `brew install openjdk` and add `/opt/homebrew/opt/openjdk/bin`
to your `PATH`. Without Java the entire packages build fails before
swapper code is touched.

## Pre-compressed asset gotcha

`public/generated/` ships pre-compressed `.br` (Brotli) and `.gz` (gzip)
siblings of every JSON file. Vite serves these to any client sending an
`Accept-Encoding` header (i.e., every browser). When you edit a JSON
under `public/generated/` you MUST regenerate the matching `.br` and
`.gz`, otherwise browsers will silently keep loading stale content while
`curl` shows the new content. Symptom for this integration: strkBTC was
not appearing in the buy asset search even though the JSON on disk had
it and `curl` returned it. The fix:

```bash
node -e "
const zlib = require('zlib'), fs = require('fs');
for (const f of ['public/generated/asset-manifest.json', 'public/generated/generatedAssetData.json']) {
  const d = fs.readFileSync(f);
  fs.writeFileSync(f + '.br', zlib.brotliCompressSync(d, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }));
  fs.writeFileSync(f + '.gz', zlib.gzipSync(d, { level: 9 }));
}"
```

This is normally handled by the asset-data regeneration script, but is
easy to miss when patching the JSONs by hand (e.g. inserting a brand-new
asset that CoinGecko hasn't indexed yet, like strkBTC at the time of
this integration).
