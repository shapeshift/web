# Bebop Integration Technical Findings - Complete Analysis

## Executive Summary

Bebop API has been thoroughly tested and analyzed. The integration is feasible and should follow existing ShapeShift swapper patterns, particularly those established by Zrx and CowSwap implementations. The key differentiator is Bebop's dual-route system (PMM and JAM) which provides better price discovery and liquidity coverage.

## 1. API Testing Results

### 1.1 Working Endpoints and Authentication

**Base URL Pattern:** `https://api.bebop.xyz/router/{chain}/v1/quote`

**Supported Chains:**
- ethereum
- polygon  
- arbitrum
- bsc
- base
- optimism

**Authentication:**
```bash
x-api-key: <YOUR_BEBOP_API_KEY>
```

**Rate Limiting:** No rate limiting observed in testing (5+ rapid requests successful)

### 1.2 Successful Test Commands

**Note for Claude Code:** To execute these curl commands, replace `<YOUR_BEBOP_API_KEY>` with the actual key from `.env` or `.env.development` (look for `VITE_BEBOP_API_KEY`).

```bash
# Ethereum: USDC to WETH (100 USDC)
curl -s -X GET 'https://api.bebop.xyz/router/ethereum/v1/quote?sell_tokens=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&buy_tokens=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&sell_amounts=100000000&taker_address=0x0000000000000000000000000000000000000000' \
  -H 'x-api-key: <YOUR_BEBOP_API_KEY>'

# Polygon: USDC to WMATIC
curl -s -X GET 'https://api.bebop.xyz/router/polygon/v1/quote?sell_tokens=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174&buy_tokens=0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270&sell_amounts=1000000&taker_address=0x0000000000000000000000000000000000000000' \
  -H 'x-api-key: <YOUR_BEBOP_API_KEY>'

# Arbitrum: USDC to WETH
curl -s -X GET 'https://api.bebop.xyz/router/arbitrum/v1/quote?sell_tokens=0xaf88d065e77c8cC2239327C5EDb3A432268e5831&buy_tokens=0x82aF49447D8a07e3bd95BD0d56f35241523fBab1&sell_amounts=1000000&taker_address=0x0000000000000000000000000000000000000000' \
  -H 'x-api-key: <YOUR_BEBOP_API_KEY>'
```

## 2. Response Structure Deep Dive

### 2.1 Dual Route System

Bebop provides TWO execution paths for every quote:

**PMMv3 (Private Market Maker)**
- Direct RFQ with professional market makers
- 0% slippage guaranteed
- Better for standard pairs and larger trades
- Usually wins on price

**JAMv2 (Just-in-time Aggregation Model)**  
- Aggregates multiple liquidity sources
- Supports any token
- Better for exotic pairs
- Fallback when PMM has insufficient liquidity

### 2.2 Response Schema

```typescript
interface BebopQuoteResponse {
  routes: [
    {
      type: "PMMv3",
      quote: {
        quoteId: string,                    // "121-151492148097891113670775997331741179850"
        status: "QUOTE_SUCCESS",
        approvalTarget: Address,            // 0xbbbbbBB520d69a9775E85b458C58c648259FAD5F
        settlementAddress: Address,         // 0xbbbbbBB520d69a9775E85b458C58c648259FAD5F
        approvalType: "Standard",
        expiry: number,                     // Unix timestamp
        gasFee: {
          native: string,                   // "121630320316683"
          usd: number                       // 0.397648
        },
        buyTokens: {
          [tokenAddress]: {
            amount: string,                 // "30341871598244352"
            minimumAmount: string,          // With slippage
            decimals: number,
            symbol: string,
            priceUsd: number
          }
        },
        sellTokens: {
          [tokenAddress]: {
            amount: string,
            decimals: number,
            symbol: string,
            priceUsd: number
          }
        },
        toSign: {                           // PMMv3 order structure
          partner_id: number,
          expiry: number,
          taker_address: Address,
          maker_address: Address,
          maker_nonce: string,
          taker_token: Address,
          maker_token: Address,
          taker_amount: string,
          maker_amount: string,
          receiver: Address,
          packed_commands: string
        },
        onchainOrderType: "SingleOrder"
      }
    },
    {
      type: "JAMv2",
      quote: {
        quoteId: string,                    // UUID format
        status: "Success",
        approvalTarget: Address,            // 0xC5a350853E4e36b73EB0C24aaA4b8816C9A3579a
        settlementAddress: Address,         // 0xbeb0b0623f66bE8cE162EbDfA2ec543A522F4ea6
        toSign: {                           // JAMv2 order structure
          taker: Address,
          receiver: Address,
          expiry: number,
          exclusivityDeadline: number,
          nonce: string,
          executor: Address,
          partnerInfo: string,
          sellTokens: Address[],
          buyTokens: Address[],
          sellAmounts: string[],
          buyAmounts: string[],
          hooksHash: Hex
        }
      }
    }
  ],
  bestPrice: "PMMv3" | "JAMv2",           // Bebop's recommendation
  errors: {},                              // Per-route errors
  link: string                             // Bebop UI link
}
```

## 3. Critical Implementation Requirements

### 3.1 Address Checksumming (MANDATORY)

**Issue:** Bebop API requires EIP-55 checksummed addresses
**Error:** `{"errorCode": 101, "message": "Token address not checksummed"}`

**Solution:**
```javascript
// Use viem or ethers for checksumming
import { getAddress } from 'viem'
const checksummed = getAddress(lowercaseAddress)
```

### 3.2 Native ETH Handling

| Scenario | Support | Implementation |
|----------|---------|----------------|
| Sell native ETH | ❌ Not supported | Use WETH instead |
| Buy native ETH | ✅ Supported | Use 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE |

### 3.3 Trade Constraints

- **Minimum trade value:** $0.01 USD
- **Error codes:**
  - 101: Address not checksummed
  - 102: Insufficient liquidity  
  - 104: Trade too small
  - 105: Token not supported
  - 106: Gas exceeds trade value
  - 108: No routes found

## 4. Consistency Mapping with Existing Swappers

### 4.1 Pattern Comparison

| Feature | Zrx | CowSwap | Bebop Implementation |
|---------|-----|---------|----------------------|
| **Default Slippage** | 0.2% | 0.5% | **0.3%** (recommended) |
| **Slippage Param** | `slippageBps` | In appData | `slippage` in quote request |
| **Quote ID** | UUID | Numeric string | Use `quoteId` from best route |
| **Approval Contract** | PERMIT2_CONTRACT | COW_SWAP_VAULT_RELAYER | Use `approvalTarget` from response |
| **Error Type** | SwapErrorRight | SwapErrorRight | Same pattern |
| **Rate Endpoint** | `/price` | `/quote` with cache | Use quote endpoint |
| **Tx Metadata** | `zrxTransactionMetadata` | `cowswapQuoteResponse` | `bebopQuoteResponse` |
| **Network Fees** | Calculate from gas | 0 (gasless) | Use `gasFee.native` |
| **Protocol Fees** | In `fees` object | `feeAmount` | Calculate from buy/sell difference |
| **Execution** | `executeEvmTransaction` | `executeEvmMessage` | `executeEvmTransaction` |

### 4.2 File Structure Following Existing Pattern

```
packages/swapper/src/swappers/BebopSwapper/
├── BebopSwapper.ts           # Main swapper implementation
├── endpoints.ts              # API endpoint definitions
├── types.ts                  # TypeScript interfaces
├── index.ts                  # Exports
├── getBebopTradeQuote/
│   ├── getBebopTradeQuote.ts
│   └── getBebopTradeQuote.test.ts
├── getBebopTradeRate/
│   └── getBebopTradeRate.ts
└── utils/
    ├── bebopService.ts       # API service layer
    └── helpers.ts            # Helper functions
```

## 5. Implementation Code Patterns

### 5.1 Service Layer (following zrxService pattern)

```typescript
// bebopService.ts
export const bebopServiceFactory = ({ baseUrl }: { baseUrl: string }) => {
  return {
    get: async (endpoint: string, params: any) => {
      // Checksum all addresses in params
      const checksummedParams = checksumAddresses(params)
      
      // Make request with monadic error handling
      const response = await makeSwapperAxiosServiceMonadic(
        axios.create({
          baseURL: baseUrl,
          headers: { 'x-api-key': config.VITE_BEBOP_API_KEY }
        })
      ).get(endpoint, { params: checksummedParams })
      
      return response
    }
  }
}
```

### 5.2 Quote Function (following Zrx pattern)

```typescript
export async function getBebopTradeQuote(
  input: GetEvmTradeQuoteInputBase,
  config: SwapperConfig,
): Promise<Result<TradeQuote, SwapErrorRight>> {
  // 1. Validate trade pair
  const assertion = assertValidTrade({ buyAsset, sellAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())
  
  // 2. Get slippage
  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Bebop)
  
  // 3. Fetch quote from Bebop
  const bebopChain = getBebopChainName(chainId)
  const response = await bebopService.get(`/router/${bebopChain}/v1/quote`, {
    sell_tokens: checksumAddress(sellAsset.assetReference),
    buy_tokens: checksumAddress(buyAsset.assetReference),
    sell_amounts: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    taker_address: receiveAddress,
    slippage: Number(slippageTolerancePercentageDecimal)
  })
  
  // 4. Select best route
  const bestRouteType = response.data.bestPrice
  const bestRoute = response.data.routes.find(r => r.type === bestRouteType)
  
  // 5. Build TradeQuote
  return Ok({
    id: bestRoute.quote.quoteId,
    quoteOrRate: 'quote',
    receiveAddress,
    slippageTolerancePercentageDecimal,
    swapperName: SwapperName.Bebop,
    steps: [{
      ...buildStepFromBebopQuote(bestRoute.quote)
    }]
  })
}
```

### 5.3 Helper Functions

```typescript
// helpers.ts
import { getAddress } from 'viem'

export function checksumAddress(address: string): string {
  return getAddress(address.toLowerCase())
}

export function getBebopChainName(chainId: ChainId): string {
  const mapping: Record<number, string> = {
    1: "ethereum",
    10: "optimism",
    56: "bsc", 
    137: "polygon",
    8453: "base",
    42161: "arbitrum"
  }
  
  const id = Number(chainId.split(':')[1])
  if (!mapping[id]) {
    throw new Error(`Unsupported chain for Bebop: ${chainId}`)
  }
  return mapping[id]
}

export function selectBestBebopRoute(response: BebopResponse): BebopRoute {
  const bestType = response.bestPrice
  return response.routes.find(r => r.type === bestType)!
}
```

## 6. Key Differences Requiring Special Handling

### 6.1 Dual Route System
- Store both routes in quote metadata
- Use `bestPrice` field for primary execution
- Consider fallback to secondary route on failure

### 6.2 Different Approval Targets
- PMMv3: `0xbbbbbBB520d69a9775E85b458C58c648259FAD5F`
- JAMv2: `0xC5a350853E4e36b73EB0C24aaA4b8816C9A3579a`
- Must use the correct target based on selected route

### 6.3 Different Signing Structures
- PMMv3: Uses maker/taker order format
- JAMv2: Uses array-based token/amount format
- Both require EIP-712 signing but with different schemas

### 6.4 No Direct Swap Endpoint
- Execution happens through settlement contracts
- Transaction is built from `toSign` object
- Similar to CowSwap's order submission model

## 7. Testing Checklist

### Completed Testing ✅
- [x] Basic quote fetching on Ethereum
- [x] Multi-chain support (Polygon, Arbitrum)
- [x] Error case handling
- [x] Address checksumming requirements
- [x] Native ETH vs WETH behavior
- [x] Rate limiting assessment
- [x] Minimum trade amount validation
- [x] Response structure analysis
- [x] Transaction data format inspection

### Pending Integration Testing
- [ ] EIP-712 signing implementation
- [ ] Approval flow with both targets
- [ ] Transaction execution via settlement contracts
- [ ] Route fallback logic
- [ ] Gas estimation accuracy
- [ ] Slippage handling verification

## 8. Implementation Priority

1. **Phase 1: Core Integration**
   - bebopService with checksumming
   - getBebopTradeQuote function
   - Helper utilities
   - Error handling

2. **Phase 2: Route Optimization**
   - Dual route storage
   - Best price selection logic
   - Fallback handling

3. **Phase 3: Execution**
   - EIP-712 signing
   - Transaction building
   - Approval management

4. **Phase 4: Testing & Polish**
   - Comprehensive test suite
   - Edge case handling
   - Performance optimization

## 9. Configuration Requirements

Add to SwapperConfig:
```typescript
VITE_BEBOP_API_KEY: string              // Get from .env: VITE_BEBOP_API_KEY
VITE_BEBOP_BASE_URL: string             // "https://api.bebop.xyz"
```

Add to SwapperName enum:
```typescript
export enum SwapperName {
  // ... existing
  Bebop = 'Bebop',
}
```

Add to constants.ts:
```typescript
const DEFAULT_BEBOP_SLIPPAGE_DECIMAL_PERCENTAGE = '0.003' // 0.3%
```

## 10. Summary

Bebop integration is technically straightforward and follows established ShapeShift patterns. The main implementation considerations are:

1. **Mandatory address checksumming** - Critical requirement
2. **Dual route system** - Provides better execution but needs proper handling
3. **Pattern consistency** - Follow Zrx/CowSwap patterns for seamless integration
4. **Use bestPrice field** - Let Bebop optimize route selection

The integration will provide ShapeShift users with:
- Better pricing through PMM's 0% slippage quotes
- Wider token coverage through JAM aggregation
- Improved execution reliability with dual routes
- Competitive pricing on all trade sizes

All technical blockers have been identified and solutions documented. The integration can proceed with high confidence.
