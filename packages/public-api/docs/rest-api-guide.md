A step-by-step guide to executing a swap via the REST API. Full request/response schemas for every endpoint are in the reference sections below — this guide covers the flow and the semantics that aren't obvious from the schemas alone (quote expiry, status polling, errors).

All paths are relative to `https://api.shapeshift.com`. Send `X-Partner-Code: <your-code>` on the swap endpoints to attribute swaps for affiliate revenue (optional).

## 1. Discover chains and assets

```
GET /v1/chains
GET /v1/assets?chainId=eip155:1&limit=100&offset=0
```

`GET /v1/assets` supports optional `chainId`, `limit` (1–1000, default 100), and `offset` (default 0) query params for filtering and pagination. Use `GET /v1/assets/count` to size pagination. Look up a single asset with `GET /v1/assets/{assetId}` (the asset ID is a full CAIP-19 string).

### Destination-only chains

Each chain carries `isSellSupported`. Where it is `false` the chain can be **bought into but not sold from** — we have no way to give you a transaction to sign on it, so `/v1/swap/rates` and `/v1/swap/quote` reject it as a `sellAssetId` with a `400` and `code: 'UNSUPPORTED_SELL_CHAIN'`. It remains valid as a `buyAssetId`, where all you need is a receive address.

There is no per-asset equivalent — the constraint is a property of the chain, so filter your sell-asset list by joining assets to their `chainId`:

```js
const sellable = new Set(chains.filter(c => c.isSellSupported).map(c => c.chainId))
const sellAssets = assets.filter(a => sellable.has(a.chainId))
```

The set shrinks over time as more chains become executable, so read the flag rather than hardcoding the list.

## 2. Get rates

```
GET /v1/swap/rates?sellAssetId=eip155:1/slip44:60&buyAssetId=eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&sellAmountCryptoBaseUnit=1000000000000000000
X-Partner-Code: your-partner-code
```

Optional `slippageTolerancePercentageDecimal` (e.g. `0.01` for 1%). The response returns a `rates` array (one entry per swapper, each with its own `swapperName`, amounts, fees, and an optional per-swapper `error`) plus `timestamp` and `expiresAt`. **Rates are indicative**, expire quickly (`expiresAt` ≈ 30s after issue), and are for display/comparison — request a quote to execute.

A non-empty `allowanceContract` on a rate means executing that swapper pulls the sell token from an ERC-20 allowance. Clients that want to handle approvals themselves — checking the current allowance, or setting an unlimited approval ahead of time — can use it directly at this stage; otherwise the quote supplies ready-to-sign approval transactions.

## 3. Get an executable quote

```
POST /v1/swap/quote
Content-Type: application/json
X-Partner-Code: your-partner-code

{
  "sellAssetId": "eip155:1/slip44:60",
  "buyAssetId": "bip122:000000000019d6689c085ae165831e93/slip44:0",
  "sellAmountCryptoBaseUnit": "1000000000000000000",
  "swapperName": "Relay",
  "receiveAddress": "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
  "sendAddress": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "slippageTolerancePercentageDecimal": "0.01",
  "accountNumber": 0
}
```

- `swapperName` comes from the rate you chose in step 2.
- `slippageTolerancePercentageDecimal` is optional; `accountNumber` is optional (defaults to `0`) and is needed for chains that derive addresses per account index (e.g. UTXO/Cosmos).
- The response includes a `quoteId` (needed for status tracking), an `approval` object (whether an ERC-20 approval is required, the spender, and ready-to-sign `approvalTxs` when it is), and a `steps` array. Each step may include `transactionData` — a discriminated union on `type` (`evm`, `solana`, `utxo`, `cosmossdk_msg_send`, `cosmossdk_msg_deposit`) — describing exactly what to sign for that chain.
- Quotes expire: honor the `expiresAt` timestamp — it reflects the swapper's own quote deadline (e.g. THORChain inbound addresses rotate, deposit-address swappers deactivate their channels; deadline-less providers get a conservative 60s). **Never sign or broadcast after `expiresAt`** — for deposit-style swappers funds sent late can be lost. Request a fresh quote instead.

## 4. Execute the swap

The API does **not** broadcast transactions — your application signs and broadcasts with the user's wallet:

1. If `approval.isRequired` is true, sign and broadcast each transaction in `approval.approvalTxs` in order, waiting for each to confirm. These are **exact approvals** — sized to the step's `sellAmountCryptoBaseUnit` and consumed by the swap's execution, so a later swap needs its own approval unless a sufficient allowance is already in place (`approvalTxs` is empty in that case, with `isRequired: false`). Usually it is a single approve; tokens that require resetting a non-zero allowance before changing it (e.g. USDT) get a preceding `approve(spender, 0)`. Clients preferring an unlimited approval can build their own `approve(approval.spender, amount)` instead. Quotes are issued before approval exists — network fees are estimated as if the approval were already in place.
2. For each step with `transactionData`, build, sign, and broadcast the transaction according to its `type` (EVM tx, Solana instructions, UTXO PSBT/deposit, or Cosmos message).
3. Capture the resulting transaction hash for status tracking.

## 5. Track status

```
GET /v1/swap/status?quoteId=<quoteId>&txHash=0x...
```

- On the **first call after broadcasting**, include `txHash` to bind it to the quote and begin tracking. This sets status to `submitted`. Subsequent polls can omit `txHash`.
- `status` is one of `submitted`, `confirmed`, `failed`. Poll until `confirmed` or `failed`; a `buyTxHash` appears once the destination transaction is known.
- Poll at a modest interval (e.g. every 5–15s) and respect rate-limit headers. Stop polling on a terminal status.

### Status errors

- `404` `QUOTE_NOT_FOUND` — the quote is unknown or has expired from the store. Request a new quote.
- `400` `TX_HASH_REQUIRED` — no `txHash` was provided and none is bound yet; pass the broadcast tx hash.
- `409` `TX_HASH_MISMATCH` — a different `txHash` is already bound to this quote.

## Affiliate reporting (optional)

Once live, partners can review attributed activity by partner code:

```
GET /v1/affiliate/stats?partnerCode=your-partner-code
GET /v1/affiliate/swaps?partnerCode=your-partner-code
```

You can also resolve a code to its attribution details (partner address and bps split) with `GET /v1/partner/{code}`.
