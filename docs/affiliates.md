# ShapeShift Affiliate Program

Earn revenue share on swaps executed through your integration.

## Quick Start

### 1. Using the Swap Widget

```tsx
import { SwapWidget } from '@shapeshiftoss/swap-widget'

<SwapWidget
  affiliateAddress="0xYourWalletAddress"
  // Optional: use a partner code instead
  partnerCode="yourcode"
  // Optional: override BPS (if registered)
  affiliateBps="100"
/>
```

### 2. Using the Public API

Include these headers in your API requests:

```bash
curl https://api.shapeshift.com/v1/swap/rates \
  -H "X-Affiliate-Address: 0xYourWalletAddress" \
  -H "Content-Type: application/json" \
  -d '{"sellAssetId": "...", "buyAssetId": "...", "sellAmountCryptoBaseUnit": "..."}'
```

Or use a partner code:

```bash
curl https://api.shapeshift.com/v1/swap/rates \
  -H "X-Partner-Code: yourcode" \
  -H "Content-Type: application/json" \
  -d '...'
```

## Headers

| Header | Description |
|--------|-------------|
| `X-Affiliate-Address` | Your EVM wallet address (0x...) |
| `X-Partner-Code` | Your partner code (if registered) |
| `X-Affiliate-Bps` | Override BPS (optional, 0-1000) |

## Registering as an Affiliate

1. Go to the [Affiliate Dashboard](https://affiliate.shapeshift.com)
2. Connect your wallet
3. Your address is automatically registered with default BPS
4. Optionally claim a partner code

### Partner Codes

Partner codes are short identifiers (3-32 alphanumeric characters) that map to your wallet. Benefits:

- Easier to share than a wallet address
- Can be used in place of `X-Affiliate-Address`
- One code per affiliate

Reserved codes: `shapeshift`, `ss`, `admin`, `api`, `test`, `demo`

## Fee Structure

| BPS | Percentage | Description |
|-----|------------|-------------|
| 10 | 0.1% | Minimum (API base) |
| 60 | 0.6% | Default |
| 100 | 1.0% | Example custom |

- **BPS** = Basis Points (1 BPS = 0.01%)
- Fees are taken from the sell amount
- Related asset swaps (e.g., ETH → WETH) have 0% fee

## Revenue Attribution

Every swap executed through your integration is tracked:

- Your affiliate address is recorded
- Volume and fees are calculated
- Stats available in the affiliate dashboard

### Viewing Your Stats

```bash
# Get your stats
curl "https://api.shapeshift.com/v1/affiliate/stats?address=0xYour..."

# Response
{
  "totalSwaps": 1234,
  "totalVolumeUsd": "1234567.89",
  "totalFeesEarnedUsd": "7407.41"
}
```

## API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/affiliate/stats?address=...` | Get swap stats |
| GET | `/v1/partner/:code` | Resolve partner code |

### Authenticated Endpoints (requires wallet signature)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/affiliate` | Register as affiliate |
| PATCH | `/v1/affiliate/:address` | Update settings |
| POST | `/v1/affiliate/claim-code` | Claim partner code |

## Support

- **Dashboard**: https://affiliate.shapeshift.com
- **Discord**: https://discord.gg/shapeshift
- **Email**: affiliates@shapeshift.com
