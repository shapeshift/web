# ShapeShift Affiliate Program

Earn revenue share on swaps executed through your integration — whether you embed the
[Swap Widget](../packages/swap-widget/README.md) or call the
[Public API](../packages/public-api/docs/introduction.md) directly.

Attribution is driven by a **partner code**: a short identifier registered to an EVM wallet address.
Pass it to the widget or the API, and ShapeShift attributes each swap to your affiliate account and
applies your configured fee automatically.

## Quick Start

### 1. Get a partner code

Register at the [Affiliate Dashboard](https://dashboard.affiliate.shapeshift.com/): connect your wallet, sign
in (a wallet signature — no gas), and you'll be issued a partner code mapped to your wallet. You'll
use this code everywhere below.

### 2. Using the Swap Widget

Pass your `partnerCode` prop. The widget renders once Reown AppKit is initialized: either pass
`walletConnectProjectId` and the widget initializes AppKit for you (shown below), or initialize AppKit
yourself in the host app and the widget reads the shared instance — see the
[widget README](../packages/swap-widget/README.md).

```tsx
import { SwapWidget } from '@shapeshiftoss/swap-widget'

<SwapWidget
  walletConnectProjectId="your-walletconnect-project-id"
  partnerCode="your-partner-code"
/>
```

### 3. Using the Public API

Send the `X-Partner-Code` header on the swap endpoints (`/v1/swap/rates`, `/v1/swap/quote`,
`/v1/swap/status`). The API attributes the swap to your affiliate account and applies your configured fee.

```bash
curl "https://api.shapeshift.com/v1/swap/rates?sellAssetId=eip155:1/slip44:60&buyAssetId=eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&sellAmountCryptoBaseUnit=1000000000000000000" \
  -H "X-Partner-Code: your-partner-code"
```

## The `X-Partner-Code` header

| Header           | Description                                                              |
| ---------------- | ------------------------------------------------------------------------ |
| `X-Partner-Code` | Your registered partner code. Attributes the swap to your affiliate account and applies your fee. |

The partner code is the attribution mechanism: it maps to the affiliate parameters (payout address
and fee) configured for your account, so there's no separate address or bps header to send. Requests
without a partner code still succeed, but the swap is unattributed and uses the default fee.

## Fees

Fees are expressed in **basis points (bps)** — 1 bps = 0.01%, so 60 bps = 0.6%. The fee that applies
to swaps attributed to your partner code is configured at registration; swaps with no partner code
use ShapeShift's default fee.

The API surfaces the fee breakdown for each rate/quote via the `affiliateBps` (total), `partnerBps`,
and `shapeshiftBps` fields — these reflect the fee that will actually be applied, so read them per
quote rather than assuming a fixed rate.

## Revenue Attribution & Reporting

Every swap carrying your partner code is attributed to you. Review your activity in the dashboard, or
query the API by partner code:

```bash
# Aggregate stats (optional startDate / endDate)
curl "https://api.shapeshift.com/v1/affiliate/stats?partnerCode=your-partner-code"

# Example response
{
  "totalSwaps": 1234,
  "totalVolumeUsd": "1234567.89",
  "totalFeesEarnedUsd": "7407.41"
}
```

```bash
# Paginated swap history (optional startDate / endDate / limit / cursor)
curl "https://api.shapeshift.com/v1/affiliate/swaps?partnerCode=your-partner-code"
```

## API Endpoints

| Method | Endpoint                                  | Auth            | Description                              |
| ------ | ----------------------------------------- | --------------- | ---------------------------------------- |
| GET    | `/v1/affiliate/stats?partnerCode=...`     | none            | Aggregate swap stats for a partner code  |
| GET    | `/v1/affiliate/swaps?partnerCode=...`     | none            | Paginated swap history for a partner code |
| GET    | `/v1/partner/{code}`                      | none            | Resolve a partner code to its attribution details (address, bps split) |
| GET    | `/v1/affiliate/{address}`                 | none            | Look up an affiliate by wallet address   |
| POST   | `/v1/affiliate`                           | wallet (SIWE)   | Register as an affiliate                 |
| PATCH  | `/v1/affiliate/{address}`                 | wallet (SIWE)   | Update affiliate settings                |

Wallet-authenticated endpoints use Sign-In With Ethereum (`POST /v1/auth/siwe/nonce` →
`POST /v1/auth/siwe/verify`). Most partners never call these directly — the
[Affiliate Dashboard](https://dashboard.affiliate.shapeshift.com/) handles registration for you.

See the full request/response schemas in the [Public API reference](https://api.shapeshift.com/docs).
