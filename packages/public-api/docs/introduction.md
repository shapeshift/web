The ShapeShift Public API lets you integrate multi-chain swap functionality into your application. Fetch rates from multiple DEX aggregators and bridges, build executable quotes, and track swaps across supported blockchains.

## Base URL

```
https://api.shapeshift.com
```

All endpoints are versioned under `/v1` (e.g. `https://api.shapeshift.com/v1/swap/rates`). This interactive reference is served at `https://api.shapeshift.com/docs`, and the raw OpenAPI document at `https://api.shapeshift.com/docs/json`.

## Two ways to integrate

1. **Swap Widget SDK** — a drop-in React component with built-in UI, wallet connection, and multi-chain support. The fastest path. See the **Swap Widget SDK** section.
2. **REST API** — call the endpoints directly and build your own UI for full control over UX. See the **REST API Guide** section, then the per-endpoint reference below.

## Affiliate tracking (optional)

Send an `X-Partner-Code` header with your registered partner code (e.g. `vultisig`) on the swap endpoints to attribute swaps for affiliate revenue share. The API attributes the swap to your affiliate account and applies your configured fee (bps) automatically. All endpoints work without it — unattributed swaps use the default fee. See the [Affiliate Program guide](https://github.com/shapeshift/web/blob/develop/docs/affiliates.md) for how to obtain a code.

## Asset IDs (CAIP-19)

Assets are identified with [CAIP-19](https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-19.md): `{chainId}/{assetNamespace}:{assetReference}`

- Native ETH: `eip155:1/slip44:60`
- USDC on Ethereum: `eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48`
- Native BTC: `bip122:000000000019d6689c085ae165831e93/slip44:0`

Chains use [CAIP-2](https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md) (e.g. `eip155:1`). Use `GET /v1/chains` and `GET /v1/assets` to discover supported values.

## Errors

Errors return the appropriate HTTP status and a JSON body:

```json
{ "error": "Human-readable message", "code": "MACHINE_CODE", "details": [] }
```

`code` and `details` are present where applicable (e.g. `QUOTE_NOT_FOUND`, `TX_HASH_REQUIRED`, `TX_HASH_MISMATCH`, `RATE_LIMIT_EXCEEDED`, validation `details`).

## Rate limiting

Endpoints are rate limited per IP on a 60-second sliding window (data, rates, quote, status, and affiliate endpoints have independent limits). When exceeded, the API returns `429` with code `RATE_LIMIT_EXCEEDED` and these headers:

- `Retry-After` — seconds until the window resets
- `RateLimit-Limit` — max requests allowed per window
- `RateLimit-Remaining` — requests remaining in the current window
- `RateLimit-Reset` — seconds until the window resets

Back off using `Retry-After` and avoid polling faster than necessary (see the REST API Guide for polling guidance).
