# Bebop Integration Analysis for ShapeShift Web

## Executive Summary
This document provides a comprehensive analysis of integrating Bebop as a swapper in ShapeShift Web. Bebop is a DEX aggregator that uses both PMM (Private Market Maker) and JAM (Just-in-time Auction Mechanism) models to provide competitive rates across multiple EVM chains.

## 1. Bebop API Overview

### 1.1 API Structure
Bebop provides a Router API that aggregates quotes from multiple sources:
- **PMM RFQ (Request for Quote)**: Market makers compete for trades
- **JAM (Just-in-time Auction Mechanism)**: Intent-based auction system

### 1.2 Supported Chains (Confirmed via Testing)
- Ethereum (chainId: 1)
- Polygon (chainId: 137)
- Arbitrum (chainId: 42161)
- Base (chainId: 8453)
- Avalanche (chainId: 43114)
- Optimism (chainId: 10)
- BSC (chainId: 56)

### 1.3 API Endpoints
- **Base URL**: `https://api.bebop.xyz/router/{network}/v1`
- **Quote Endpoint**: `/quote`
- **Authentication**: Header `source-auth: {API_KEY}`

### 1.4 Key Features
- Single and multi-token swaps
- Guaranteed rates with price locks
- Gasless approvals available
- Self-custodial execution
- Multiple route options (PMM and JAM)

## 2. Current Implementation in shapeshiftAgenticChat

### 2.1 File Structure
```
apps/agentic-server/src/utils/getBebopRate/
├── getBebopRate.ts    # Main implementation
├── types.ts           # TypeScript interfaces
└── index.ts          # Exports
```

### 2.2 Key Implementation Details

#### API Configuration
- API Key: Retrieved from `process.env.BEBOP_API_KEY`
- Native token marker: `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE`

#### Chain Mapping
```typescript
const bebopChainsMap: Record<ChainId, string> = {
  [ethChainId]: 'ethereum',
  [polygonChainId]: 'polygon',
  [arbitrumChainId]: 'arbitrum',
  [baseChainId]: 'base',
  [avalancheChainId]: 'avalanche',
  [optimismChainId]: 'optimism',
  [bscChainId]: 'bsc',
}
```

#### Request Parameters
```typescript
{
  sell_tokens: sellTokenAddress,
  buy_tokens: buyTokenAddress,
  sell_amounts: sellAmountBaseUnit,
  taker_address: userAddress,
  approval_type: 'Standard',
  skip_validation: 'true',
  gasless: 'false',
  source: 'shapeshift',
}
```

## 3. ShapeShift Web Swapper Architecture

### 3.1 Core Components

#### Swapper Interface
```typescript
export type Swapper = {
  executeEvmTransaction?: (
    txToSign: SignTx<EvmChainId>,
    callbacks: EvmTransactionExecutionProps,
  ) => Promise<string>
}
```

#### SwapperApi Interface
```typescript
export type SwapperApi = {
  checkTradeStatus: (input: CheckTradeStatusInput) => Promise<TradeStatus>
  getTradeQuote: (input: CommonTradeQuoteInput, deps: SwapperDeps) => Promise<TradeQuoteResult>
  getTradeRate: (input: GetTradeRateInput, deps: SwapperDeps) => Promise<TradeRateResult>
  getUnsignedEvmTransaction?: (input: GetUnsignedEvmTransactionArgs) => Promise<SignTx<EvmChainId>>
  getEvmTransactionFees?: (...) => Promise<string>
}
```

### 3.2 Registration Pattern
Swappers are registered in `packages/swapper/src/constants.ts`:
```typescript
export const swappers: Record<SwapperName, (SwapperApi & Swapper) | undefined> = {
  [SwapperName.Bebop]: {
    ...bebopSwapper,
    ...bebopApi,
  },
  // ... other swappers
}
```

### 3.3 Feature Flag Integration
Feature flags in `src/state/slices/preferencesSlice/preferencesSlice.ts`:
```typescript
export type FeatureFlags = {
  BebopSwap: boolean
  // ... other flags
}
```

## 4. Implementation Plan

### 4.1 File Structure
```
packages/swapper/src/swappers/BebopSwapper/
├── BebopSwapper.ts                     # Swapper implementation
├── endpoints.ts                        # SwapperApi implementation
├── types.ts                           # TypeScript interfaces
├── constants.ts                       # Constants and configuration
├── getBebopTradeQuote/
│   ├── getBebopTradeQuote.ts         # Quote fetching logic
│   └── getBebopTradeQuote.test.ts    # Unit tests
├── getBebopTradeRate/
│   └── getBebopTradeRate.ts          # Rate fetching logic
└── utils/
    ├── bebopService.ts               # API service wrapper
    └── helpers.ts                     # Helper functions
```

### 4.2 Step-by-Step Implementation

#### Step 1: Create Types (`types.ts`)
```typescript
import type { Address, Hex } from 'viem'

export type BebopToken = {
  amount: string
  symbol: string
  name?: string
  address?: Address
  decimals: number
  priceUsd?: number
  minimumAmount?: string
  price?: number
  priceBeforeFee?: number
  amountBeforeFee?: string
  deltaFromExpected?: number
}

export type BebopTxData = {
  chainId: number
  from: Address
  to: Address
  value: Hex
  data: Hex
  gas?: number | null
  gasPrice?: number | null
}

export type BebopQuote = {
  type: string
  status: string
  quoteId: string
  chainId: number
  approvalType: string
  nativeToken: string
  taker: string
  receiver: string
  expiry: number
  slippage: number
  gasFee: {
    native: string
    usd: number
  }
  buyTokens: Record<string, BebopToken>
  sellTokens: Record<string, BebopToken>
  settlementAddress: string
  approvalTarget: string
  requiredSignatures: string[]
  priceImpact?: number | null
  warnings: Array<{ code: number; message: string }>
  tx: BebopTxData
  hooksHash: string
  solver: string
}

export type BebopRoute = {
  quote: BebopQuote
  type: string
}

export type BebopResponse = {
  routes: BebopRoute[]
  errors: Record<string, unknown>
  link: string
  bestPrice: string
}
```

#### Step 2: Create Constants (`constants.ts`)
```typescript
import { ethChainId, polygonChainId, arbitrumChainId, baseChainId, 
         avalancheChainId, optimismChainId, bscChainId } from '@shapeshiftoss/caip'

export const BEBOP_SUPPORTED_CHAIN_IDS = [
  ethChainId,
  polygonChainId,
  arbitrumChainId,
  baseChainId,
  avalancheChainId,
  optimismChainId,
  bscChainId,
] as const

export const BEBOP_ETH_MARKER = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

export const bebopChainsMap: Record<string, string> = {
  [ethChainId]: 'ethereum',
  [polygonChainId]: 'polygon',
  [arbitrumChainId]: 'arbitrum',
  [baseChainId]: 'base',
  [avalancheChainId]: 'avalanche',
  [optimismChainId]: 'optimism',
  [bscChainId]: 'bsc',
}
```

#### Step 3: Create Service (`utils/bebopService.ts`)
```typescript
import axios from 'axios'
import type { BebopResponse } from '../types'
import { makeSwapperAxiosServiceMonadic } from '../../../utils'

const bebopAxiosInstance = axios.create({
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

export const bebopService = makeSwapperAxiosServiceMonadic(bebopAxiosInstance)

export const fetchBebopQuote = async (
  network: string,
  params: Record<string, any>,
  apiKey: string,
): Promise<BebopResponse> => {
  const url = `https://api.bebop.xyz/router/${network}/v1/quote`
  
  const response = await bebopAxiosInstance.get<BebopResponse>(url, {
    params,
    headers: { 'source-auth': apiKey },
  })
  
  return response.data
}
```

#### Step 4: Create Quote Handler (`getBebopTradeQuote/getBebopTradeQuote.ts`)
```typescript
import type { GetEvmTradeQuoteInputBase, TradeQuote, SwapErrorRight } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { fromAssetId } from '@shapeshiftoss/caip'
import { bn, bnOrZero, fromBaseUnit, toBaseUnit } from '@shapeshiftoss/utils'
import { getAddress } from 'viem'
import { Ok, Err } from '@sniptt/monads'

import { fetchBebopQuote } from '../utils/bebopService'
import { BEBOP_ETH_MARKER, bebopChainsMap, BEBOP_SUPPORTED_CHAIN_IDS } from '../constants'
import type { BebopQuote } from '../types'

export async function getBebopTradeQuote(
  input: GetEvmTradeQuoteInputBase,
  assertGetEvmChainAdapter: (chainId: string) => EvmChainAdapter,
  config: { VITE_BEBOP_API_KEY: string },
): Promise<Result<TradeQuote, SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    receiveAddress,
    affiliateBps,
    slippageTolerancePercentageDecimal,
  } = input

  // Validate chain support
  if (!BEBOP_SUPPORTED_CHAIN_IDS.includes(sellAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        code: TradeQuoteError.UnsupportedChain,
        message: `Chain ${sellAsset.chainId} is not supported by Bebop`,
      }),
    )
  }

  // Cross-chain not supported
  if (sellAsset.chainId !== buyAsset.chainId) {
    return Err(
      makeSwapErrorRight({
        code: TradeQuoteError.CrossChainNotSupported,
        message: 'Bebop does not support cross-chain swaps',
      }),
    )
  }

  const bebopNetwork = bebopChainsMap[sellAsset.chainId]
  
  const sellTokenAddress = sellAsset.isNative 
    ? BEBOP_ETH_MARKER 
    : fromAssetId(sellAsset.assetId).assetReference
    
  const buyTokenAddress = buyAsset.isNative
    ? BEBOP_ETH_MARKER
    : fromAssetId(buyAsset.assetId).assetReference

  try {
    const bebopResponse = await fetchBebopQuote(
      bebopNetwork,
      {
        sell_tokens: sellTokenAddress,
        buy_tokens: buyTokenAddress,
        sell_amounts: sellAmountIncludingProtocolFeesCryptoBaseUnit,
        taker_address: receiveAddress,
        approval_type: 'Standard',
        skip_validation: 'false',
        gasless: 'false',
        source: 'shapeshift',
        slippage: parseFloat(slippageTolerancePercentageDecimal) * 100, // Convert to basis points
      },
      config.VITE_BEBOP_API_KEY,
    )

    if (!bebopResponse.routes?.length) {
      return Err(
        makeSwapErrorRight({
          code: TradeQuoteError.NoRouteFound,
          message: 'No routes found',
        }),
      )
    }

    // Select best route (Bebop provides this in bestPrice field)
    const bestRoute = bebopResponse.routes.find(r => r.type === bebopResponse.bestPrice) 
                      || bebopResponse.routes[0]
    const quote = bestRoute.quote

    // Calculate buy amount
    const buyAmountCryptoBaseUnit = Object.values(quote.buyTokens)[0].amount
    const sellAmountCryptoBaseUnit = Object.values(quote.sellTokens)[0].amount

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)
    
    // Build trade quote
    const tradeQuote: TradeQuote = {
      id: quote.quoteId,
      receiveAddress,
      affiliateBps: affiliateBps || '0',
      potentialAffiliateBps: '0',
      rate: bn(buyAmountCryptoBaseUnit)
        .div(sellAmountCryptoBaseUnit)
        .toString(),
      slippageTolerancePercentageDecimal,
      steps: [
        {
          accountNumber: 0, // Will be set by caller
          buyAsset,
          sellAsset,
          buyAmountBeforeFeesCryptoBaseUnit: buyAmountCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit: buyAmountCryptoBaseUnit,
          sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
          feeData: {
            protocolFees: {},
            networkFeeCryptoBaseUnit: undefined, // Will be calculated in endpoints.ts
          },
          rate: bn(buyAmountCryptoBaseUnit).div(sellAmountCryptoBaseUnit).toString(),
          source: `${SwapperName.Bebop} • ${bestRoute.type}`,
          allowanceContract: quote.approvalTarget,
          estimatedExecutionTimeMs: 30000, // Estimate 30 seconds
          bebopTransactionMetadata: {
            to: quote.tx.to,
            from: quote.tx.from,
            data: quote.tx.data,
            value: quote.tx.value,
            gas: quote.tx.gas?.toString(),
          },
        },
      ],
      isStreaming: false,
      quoteOrRate: 'quote',
      swapperName: SwapperName.Bebop,
    }

    return Ok(tradeQuote)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Err(
      makeSwapErrorRight({
        code: TradeQuoteError.QueryFailed,
        message: `Failed to fetch Bebop quote: ${message}`,
      }),
    )
  }
}
```

#### Step 5: Create Rate Handler (`getBebopTradeRate/getBebopTradeRate.ts`)
```typescript
import type { GetEvmTradeRateInput, TradeRate, SwapErrorRight } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { bn, bnOrZero, fromBaseUnit } from '@shapeshiftoss/utils'
import { fromAssetId } from '@shapeshiftoss/caip'
import { Ok, Err } from '@sniptt/monads'

import { fetchBebopQuote } from '../utils/bebopService'
import { BEBOP_ETH_MARKER, bebopChainsMap, BEBOP_SUPPORTED_CHAIN_IDS } from '../constants'

export async function getBebopTradeRate(
  input: GetEvmTradeRateInput,
  config: { VITE_BEBOP_API_KEY: string },
): Promise<Result<TradeRate, SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    affiliateBps,
    receiveAddress,
  } = input

  // Validate chain support
  if (!BEBOP_SUPPORTED_CHAIN_IDS.includes(sellAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        code: TradeQuoteError.UnsupportedChain,
        message: `Chain ${sellAsset.chainId} is not supported by Bebop`,
      }),
    )
  }

  // Cross-chain not supported
  if (sellAsset.chainId !== buyAsset.chainId) {
    return Err(
      makeSwapErrorRight({
        code: TradeQuoteError.CrossChainNotSupported,
        message: 'Bebop does not support cross-chain swaps',
      }),
    )
  }

  const bebopNetwork = bebopChainsMap[sellAsset.chainId]
  
  const sellTokenAddress = sellAsset.isNative 
    ? BEBOP_ETH_MARKER 
    : fromAssetId(sellAsset.assetId).assetReference
    
  const buyTokenAddress = buyAsset.isNative
    ? BEBOP_ETH_MARKER
    : fromAssetId(buyAsset.assetId).assetReference

  try {
    // Use a dummy address for rate queries
    const dummyAddress = '0x0000000000000000000000000000000000000000'
    
    const bebopResponse = await fetchBebopQuote(
      bebopNetwork,
      {
        sell_tokens: sellTokenAddress,
        buy_tokens: buyTokenAddress,
        sell_amounts: sellAmountIncludingProtocolFeesCryptoBaseUnit,
        taker_address: receiveAddress || dummyAddress,
        approval_type: 'Standard',
        skip_validation: 'true', // Skip validation for rates
        gasless: 'false',
        source: 'shapeshift',
      },
      config.VITE_BEBOP_API_KEY,
    )

    if (!bebopResponse.routes?.length) {
      return Err(
        makeSwapErrorRight({
          code: TradeQuoteError.NoRouteFound,
          message: 'No routes found',
        }),
      )
    }

    // Select best route
    const bestRoute = bebopResponse.routes.find(r => r.type === bebopResponse.bestPrice) 
                      || bebopResponse.routes[0]
    const quote = bestRoute.quote

    // Calculate buy amount
    const buyAmountCryptoBaseUnit = Object.values(quote.buyTokens)[0].amount
    const sellAmountCryptoBaseUnit = Object.values(quote.sellTokens)[0].amount

    // Build trade rate
    const tradeRate: TradeRate = {
      id: quote.quoteId,
      receiveAddress,
      affiliateBps: affiliateBps || '0',
      rate: bn(buyAmountCryptoBaseUnit)
        .div(sellAmountCryptoBaseUnit)
        .toString(),
      slippageTolerancePercentageDecimal: undefined,
      steps: [
        {
          accountNumber: undefined, // Rates don't have account numbers
          buyAsset,
          sellAsset,
          buyAmountBeforeFeesCryptoBaseUnit: buyAmountCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit: buyAmountCryptoBaseUnit,
          sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
          feeData: {
            protocolFees: {},
            networkFeeCryptoBaseUnit: undefined,
          },
          rate: bn(buyAmountCryptoBaseUnit).div(sellAmountCryptoBaseUnit).toString(),
          source: `${SwapperName.Bebop} • ${bestRoute.type}`,
          allowanceContract: quote.approvalTarget,
          estimatedExecutionTimeMs: 30000,
        },
      ],
      isStreaming: false,
      quoteOrRate: 'rate',
      swapperName: SwapperName.Bebop,
    }

    return Ok(tradeRate)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Err(
      makeSwapErrorRight({
        code: TradeQuoteError.QueryFailed,
        message: `Failed to fetch Bebop rate: ${message}`,
      }),
    )
  }
}
```

#### Step 6: Create Endpoints (`endpoints.ts`)
```typescript
import { evm } from '@shapeshiftoss/chain-adapters'
import BigNumber from 'bignumber.js'
import type { GetEvmTradeQuoteInputBase, GetEvmTradeRateInput, SwapperApi } from '../../types'
import { checkEvmSwapStatus, getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import { getBebopTradeQuote } from './getBebopTradeQuote/getBebopTradeQuote'
import { getBebopTradeRate } from './getBebopTradeRate/getBebopTradeRate'

export const bebopApi: SwapperApi = {
  getTradeQuote: async (input, { assertGetEvmChainAdapter, config }) => {
    const tradeQuoteResult = await getBebopTradeQuote(
      input as GetEvmTradeQuoteInputBase,
      assertGetEvmChainAdapter,
      config,
    )

    return tradeQuoteResult.map(tradeQuote => [tradeQuote])
  },
  
  getTradeRate: async (input, { config }) => {
    const tradeRateResult = await getBebopTradeRate(
      input as GetEvmTradeRateInput,
      config,
    )

    return tradeRateResult.map(tradeRate => [tradeRate])
  },
  
  getUnsignedEvmTransaction: async ({
    from,
    stepIndex,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { accountNumber, sellAsset, bebopTransactionMetadata } = step
    if (!bebopTransactionMetadata) throw new Error('Transaction metadata is required')

    const { value, to, data, gas } = bebopTransactionMetadata

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

    const feeData = await evm.getFees({ adapter, data, to, value, from, supportsEIP1559 })

    return adapter.buildCustomApiTx({
      accountNumber,
      data,
      from,
      to,
      value,
      ...feeData,
      // Use the higher amount of the node or the API
      gasLimit: BigNumber.max(feeData.gasLimit, gas || '0').toFixed(),
    })
  },
  
  getEvmTransactionFees: async ({
    from,
    stepIndex,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { sellAsset, bebopTransactionMetadata } = step
    if (!bebopTransactionMetadata) throw new Error('Transaction metadata is required')

    const { value, to, data } = bebopTransactionMetadata

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

    const feeData = await evm.getFees({ adapter, data, to, value, from, supportsEIP1559 })

    return feeData.networkFeeCryptoBaseUnit
  },
  
  checkTradeStatus: checkEvmSwapStatus,
}
```

#### Step 7: Create Swapper (`BebopSwapper.ts`)
```typescript
import type { Swapper } from '../../types'
import { executeEvmTransaction } from '../../utils'

export const bebopSwapper: Swapper = {
  executeEvmTransaction,
}
```

#### Step 8: Update Constants (`packages/swapper/src/constants.ts`)
```typescript
import { bebopSwapper } from './swappers/BebopSwapper/BebopSwapper'
import { bebopApi } from './swappers/BebopSwapper/endpoints'

// Add to SwapperName enum
export enum SwapperName {
  // ... existing swappers
  Bebop = 'Bebop',
}

// Add to swappers record
export const swappers: Record<SwapperName, (SwapperApi & Swapper) | undefined> = {
  // ... existing swappers
  [SwapperName.Bebop]: {
    ...bebopSwapper,
    ...bebopApi,
  },
}

// Add default slippage
const DEFAULT_BEBOP_SLIPPAGE_DECIMAL_PERCENTAGE = '0.005' // 0.5%

// Update getDefaultSlippageDecimalPercentageForSwapper
export const getDefaultSlippageDecimalPercentageForSwapper = (
  swapperName: SwapperName | undefined,
): string => {
  // ... existing cases
  case SwapperName.Bebop:
    return DEFAULT_BEBOP_SLIPPAGE_DECIMAL_PERCENTAGE
}
```

#### Step 9: Update Types (`packages/swapper/src/types.ts`)
```typescript
// Add to SwapperConfig
export type SwapperConfig = {
  // ... existing config
  VITE_BEBOP_API_KEY: string
  VITE_BEBOP_BASE_URL: string
}

// Add to TradeQuoteStep
export type TradeQuoteStep = {
  // ... existing fields
  bebopTransactionMetadata?: {
    to: string
    from: string
    data: string
    value: string
    gas?: string
  }
}
```

#### Step 10: Update Feature Flags (`src/state/slices/preferencesSlice/preferencesSlice.ts`)
```typescript
export type FeatureFlags = {
  // ... existing flags
  BebopSwap: boolean
}

// In initialState
const initialState: Preferences = {
  featureFlags: {
    // ... existing flags
    BebopSwap: getConfig().VITE_FEATURE_BEBOP_SWAP,
  },
  // ...
}
```

#### Step 11: Update Swapper Helpers (`src/state/helpers.ts`)
```typescript
export const isCrossAccountTradeSupported = (swapperName: SwapperName) => {
  switch (swapperName) {
    // ... existing cases
    case SwapperName.Bebop:
      return false // Bebop doesn't support cross-account trades
    // ...
  }
}

export const getEnabledSwappers = (
  {
    // ... existing flags
    BebopSwap,
  }: FeatureFlags,
  isCrossAccountTrade: boolean,
  isSolBuyAssetId: boolean,
): Record<SwapperName, boolean> => {
  return {
    // ... existing swappers
    [SwapperName.Bebop]:
      BebopSwap && (!isCrossAccountTrade || isCrossAccountTradeSupported(SwapperName.Bebop)),
  }
}
```

#### Step 12: Update Environment Variables
Add to `.env` and `.env.example`:
```bash
VITE_BEBOP_API_KEY=your-api-key-here
VITE_BEBOP_BASE_URL=https://api.bebop.xyz
VITE_FEATURE_BEBOP_SWAP=true
```

#### Step 13: Export from Package (`packages/swapper/src/index.ts`)
```typescript
export * from './swappers/BebopSwapper'
```

### 4.3 Testing Strategy

#### Unit Tests
1. **Quote Fetching**: Test successful quote retrieval and error handling
2. **Rate Fetching**: Test rate calculation and edge cases
3. **Chain Support**: Verify only supported chains are accepted
4. **Cross-chain Validation**: Ensure cross-chain swaps are rejected
5. **Transaction Building**: Test transaction construction with proper gas limits

#### Integration Tests
1. **API Response Handling**: Mock Bebop API responses
2. **Fee Calculation**: Verify network fees are calculated correctly
3. **Slippage Handling**: Test slippage tolerance application
4. **Error Scenarios**: Test network failures, invalid tokens, insufficient liquidity

#### Example Test (`getBebopTradeQuote.test.ts`)
```typescript
import { describe, it, expect, vi } from 'vitest'
import { Ok, Err } from '@sniptt/monads'
import { getBebopTradeQuote } from './getBebopTradeQuote'
import { fetchBebopQuote } from '../utils/bebopService'
import { TradeQuoteError } from '../../../types'

vi.mock('../utils/bebopService')

describe('getBebopTradeQuote', () => {
  it('should return a valid trade quote', async () => {
    const mockResponse = {
      routes: [{
        type: 'PMM',
        quote: {
          quoteId: 'test-quote-id',
          buyTokens: { '0xToken': { amount: '1000000' } },
          sellTokens: { '0xOtherToken': { amount: '2000000' } },
          approvalTarget: '0xApproval',
          tx: {
            to: '0xRouter',
            from: '0xUser',
            data: '0xdata',
            value: '0x0',
            gas: 100000,
          },
        },
      }],
      bestPrice: 'PMM',
    }
    
    vi.mocked(fetchBebopQuote).mockResolvedValue(mockResponse)
    
    const result = await getBebopTradeQuote(/* ... test input ... */)
    
    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.id).toBe('test-quote-id')
    }
  })
  
  it('should reject cross-chain swaps', async () => {
    const result = await getBebopTradeQuote({
      sellAsset: { chainId: 'eip155:1' },
      buyAsset: { chainId: 'eip155:137' },
      // ... other input
    })
    
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.code).toBe(TradeQuoteError.CrossChainNotSupported)
    }
  })
})
```

## 5. Configuration Requirements

### 5.1 API Keys
- Obtain production API key from Bebop
- Store securely in environment variables
- Never commit API keys to version control

### 5.2 Rate Limiting
- Bebop API may have rate limits
- Implement exponential backoff for retries
- Consider caching quotes for short periods

### 5.3 Network Configuration
- Ensure all supported chains have proper RPC endpoints
- Configure gas price fetching for each network
- Set appropriate timeout values

## 6. Risk Analysis & Edge Cases

### 6.1 Technical Risks
1. **API Availability**: Bebop API downtime could affect swap functionality
2. **Rate Limiting**: High traffic might trigger rate limits
3. **Gas Estimation**: Bebop's gas estimates might differ from actual usage
4. **Slippage**: Market volatility could cause transaction failures

### 6.2 Mitigation Strategies
1. **Fallback Swappers**: Always have alternative swappers available
2. **Error Handling**: Comprehensive error messages for users
3. **Retry Logic**: Implement smart retry with exponential backoff
4. **Gas Buffer**: Add safety margin to gas estimates (15-20%)

### 6.3 Edge Cases
1. **Token Approvals**: Handle both standard and permit2 approvals
2. **Native Tokens**: Properly handle ETH/MATIC/BNB vs wrapped versions
3. **Decimal Precision**: Account for tokens with non-standard decimals
4. **MEV Protection**: Consider using Bebop's MEV protection features

## 7. Performance Optimizations

### 7.1 Caching
- Cache token lists per chain
- Cache approval targets
- Short-lived quote caching (5-10 seconds)

### 7.2 Parallel Requests
- Fetch quotes from multiple swappers in parallel
- Use Promise.allSettled for resilience

### 7.3 Request Optimization
- Only request quotes for supported token pairs
- Pre-validate input before API calls
- Batch requests where possible

## 8. Monitoring & Maintenance

### 8.1 Metrics to Track
- Quote success rate
- Average response time
- Error frequency by type
- Transaction success rate

### 8.2 Alerts
- API key expiration
- High error rates
- Response time degradation
- Unusual gas estimates

### 8.3 Regular Updates
- Monitor Bebop API changes
- Update supported chains
- Refresh token lists
- Review and update gas strategies

## 9. Migration Path

### Phase 1: Implementation (Week 1)
- Create core swapper files
- Implement quote/rate fetching
- Add unit tests

### Phase 2: Integration (Week 2)
- Integrate with ShapeShift Web
- Add feature flag
- Internal testing

### Phase 3: Testing (Week 3)
- Comprehensive testing on testnet
- Performance benchmarking
- Security review

### Phase 4: Rollout (Week 4)
- Gradual rollout with feature flag
- Monitor metrics
- Gather user feedback

## 10. Conclusion

Integrating Bebop as a swapper in ShapeShift Web will provide users with:
- Access to competitive rates through PMM and JAM models
- Support for 7 major EVM chains
- Improved execution through multiple route options
- MEV protection and guaranteed rates

The implementation follows established patterns in ShapeShift Web, ensuring consistency and maintainability. The modular architecture allows for easy updates and extensions as Bebop's API evolves.

## Appendix A: API Response Examples

### Successful Quote Response
```json
{
  "routes": [
    {
      "type": "PMMv3",
      "quote": {
        "quoteId": "121-105368912540075780835889715699407197842",
        "chainId": 1,
        "approvalTarget": "0xbbbbbBB520d69a9775E85b458C58c648259FAD5F",
        "tx": {
          "from": "0x0000000000000000000000000000000000000000",
          "to": "0xbbbbbBB520d69a9775E85b458C58c648259FAD5F",
          "value": "0xde0b6b3a7640000",
          "data": "0x4dcebcba...",
          "gas": 110000
        }
      }
    }
  ],
  "bestPrice": "PMMv3"
}
```

### Error Response
```json
{
  "error": "Insufficient liquidity",
  "code": "INSUFFICIENT_LIQUIDITY"
}
```

## Appendix B: Implementation Bugs Fixed

During the integration of Bebop into ShapeShift Web, several critical bugs were discovered and resolved:

### B.1 Slippage Format Bug
**Problem:** Bebop was receiving `slippage=100` (interpreted as 100%) instead of 1%
- **Root Cause:** Multiplying by 10000 to convert to basis points
- **Bebop Expects:** Percentage number (0-50) where 1 = 1%
- **Fix:** Multiply by 100 instead of 10000 (0.01 * 100 = 1%)
- **File:** `packages/swapper/src/swappers/BebopSwapper/utils/helpers/helpers.ts:192-201`

### B.2 Response Structure Parsing Bug
**Problem:** Showing "0 USDC" in UI, "Sell amount lower than fee" error
- **Root Cause:** Accessing `route.amounts.sell[0]` which doesn't exist in Router API response
- **Bebop Actually Returns:** `route.quote.sellTokens[address].amount`
- **Fix:** Updated to use correct nested structure
- **Files:**
  - `getBebopTradeQuote.ts:85-104`
  - `getBebopTradeRate.ts:68-82`

### B.3 Address Checksumming Bug
**Problem:** Quote endpoint failed with "Taker/Receiver addresses not checksummed"
- **Root Cause:** Passing lowercase address directly from wallet
- **Bebop Requires:** Checksummed addresses (mixed case)
- **Fix:** Use `getAddress()` from viem to checksum before sending
- **File:** `utils/fetchFromBebop.ts:43`
- **Example:** `0x5daf...` → `0x5daF...`

### B.4 Hex Value Conversion Bug
**Problem:** Gas estimation failed with "Number `0x894656a67289` is not a valid decimal number"
- **Root Cause:** Bebop returns `tx.value` as hex string, viem expects decimal
- **Fix:** Use `fromHex(hexValue as Hex, 'bigint').toString()`
- **File:** `endpoints.ts:47-50, 81-84`
- **Example:** `0x894656a67289` → `150935194464905`

### B.5 Error Handling Bug
**Problem:** Valid quotes rejected when some routes failed
- **Root Cause:** Failing entire quote if `errors` object had any entries
- **Bebop Behavior:** Returns partial failures (e.g., PMMv3 fails, JAMv2 succeeds) - this is normal
- **Fix:** Only fail if NO routes are available, not if some routes failed
- **File:** `utils/fetchFromBebop.ts:106-109`

### B.6 Rate vs Quote Delta Bug (Similar to Portals PR #10985)
**Problem:** Rate showed 0.600 USDC, quote showed 0.596 USDC (~0.6% delta)
- **Root Cause:** `fetchBebopPrice` hardcoded `affiliateBps: '0'`, while `fetchBebopQuote` used actual affiliate fees
- **Impact:** Misleading users with optimistic rates, then showing worse quotes
- **Fix:** Pass `affiliateBps` to both rate and quote endpoints
- **Files:**
  - `utils/fetchFromBebop.ts:149-175` - Added affiliateBps parameter
  - `getBebopTradeRate.ts:44-50` - Pass affiliateBps through

**Expected Result After Fix:**
- Rate: Shows amount after affiliate fees (realistic)
- Quote: Shows same amount (no surprise delta)
- Delta: ~0% instead of ~0.6%

### B.7 Type Safety Improvements
**Issues:**
- Using `` `0x${string}` `` instead of proper viem types
- String indexing into Address-keyed Records

**Fixes:**
- Use `Hex` type for hex strings (not `` `0x${string}` ``)
- Use `Address` type for Ethereum addresses
- Cast `Object.keys()` results to `Address` when indexing token records

---

## Appendix C: Useful Resources

1. [Bebop Documentation](https://docs.bebop.xyz)
2. [Bebop API Playground](https://api.bebop.xyz/playground)
3. [ShapeShift Swapper Package](packages/swapper/src)
4. [EIP-1559 Documentation](https://eips.ethereum.org/EIPS/eip-1559)
5. [Viem Documentation](https://viem.sh)
6. [Portals Rate/Quote Delta Fix (PR #10985)](https://github.com/shapeshift/web/pull/10985)
