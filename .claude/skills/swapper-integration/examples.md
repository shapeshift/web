# Code Examples & Templates

Generic code templates for swapper integrations. Adapt these based on your specific swapper's API.

---

## File Structure Template

```
packages/swapper/src/swappers/[SwapperName]Swapper/
├── index.ts
├── [SwapperName]Swapper.ts
├── endpoints.ts
├── types.ts
├── get[SwapperName]TradeQuote/
│   └── get[SwapperName]TradeQuote.ts
├── get[SwapperName]TradeRate/
│   └── get[SwapperName]TradeRate.ts
└── utils/
    ├── constants.ts
    ├── [swapperName]Service.ts
    ├── fetchFrom[SwapperName].ts
    └── helpers/
        └── helpers.ts
```

---

## 1. index.ts

```typescript
export * from './[SwapperName]Swapper'
export * from './endpoints'
export * from './types'
```

---

## 2. types.ts

```typescript
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Address, Hex } from 'viem'

// Supported chains
export const [swapperName]SupportedChainIds = [
  KnownChainIds.EthereumMainnet,
  KnownChainIds.PolygonMainnet,
  KnownChainIds.ArbitrumMainnet,
  // Add other supported chains
] as const

export type [SwapperName]SupportedChainId = (typeof [swapperName]SupportedChainIds)[number]

// Chain name mapping (if API uses string names instead of IDs)
export const chainIdTo[SwapperName]Chain: Record<[SwapperName]SupportedChainId, string> = {
  [KnownChainIds.EthereumMainnet]: 'ethereum',
  [KnownChainIds.PolygonMainnet]: 'polygon',
  [KnownChainIds.ArbitrumMainnet]: 'arbitrum',
  // Map all supported chains
}

// Native token marker (if API requires special address for native tokens)
// Common value: 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
// Check API docs!
export const [SWAPPER]_NATIVE_MARKER = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

// Dummy address for rate quotes (when no wallet connected)
// Commonly Vitalik's address - used for price-only quotes
export const [SWAPPER]_DUMMY_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address

// API Response types - CUSTOMIZE based on actual API response!
export type [SwapperName]QuoteResponse = {
  quoteId: string
  // Add other fields from API
}
```

---

## 3. utils/constants.ts

```typescript
export const DEFAULT_[SWAPPER]_SLIPPAGE_DECIMAL_PERCENTAGE = '0.005' // 0.5%
export const [SWAPPER]_API_BASE_URL = 'https://api.example.com'
```

---

## 4. utils/helpers/helpers.ts

```typescript
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { bn, convertPrecision, isToken } from '@shapeshiftoss/utils'
import { Err, Ok } from '@sniptt/monads'
import { getAddress } from 'viem'

import { TradeQuoteError } from '../../../../types'
import { makeSwapErrorRight } from '../../../../utils'
import type { [SwapperName]SupportedChainId } from '../../types'
import { [SWAPPER]_NATIVE_MARKER, [swapperName]SupportedChainIds } from '../../types'

// Convert AssetId to swapper's token format
export const assetIdTo[SwapperName]Token = (assetId: AssetId): string => {
  if (!isToken(assetId)) return [SWAPPER]_NATIVE_MARKER
  const { assetReference } = fromAssetId(assetId)
  return getAddress(assetReference) // Returns checksummed address
}

// Check if chain is supported
export const isSupportedChainId = (chainId: ChainId): chainId is [SwapperName]SupportedChainId => {
  return [swapperName]SupportedChainIds.includes(chainId as [SwapperName]SupportedChainId)
}

// Validate trade pair is possible
export const assertValidTrade = ({
  buyAsset,
  sellAsset,
}: {
  buyAsset: Asset
  sellAsset: Asset
}) => {
  const sellAssetChainId = sellAsset.chainId
  const buyAssetChainId = buyAsset.chainId

  // Check sell asset chain is supported
  if (!isSupportedChainId(sellAssetChainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  // Check buy asset chain is supported
  if (!isSupportedChainId(buyAssetChainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: buyAsset.chainId },
      }),
    )
  }

  // Check if cross-chain (reject if swapper doesn't support cross-chain)
  if (sellAssetChainId !== buyAssetChainId) {
    return Err(
      makeSwapErrorRight({
        message: `cross-chain not supported - both assets must be on chainId ${sellAsset.chainId}`,
        code: TradeQuoteError.CrossChainNotSupported,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  return Ok(true)
}

// Calculate exchange rate
export const calculateRate = ({
  buyAmount,
  sellAmount,
  buyAsset,
  sellAsset,
}: {
  buyAmount: string
  sellAmount: string
  buyAsset: Asset
  sellAsset: Asset
}) => {
  return convertPrecision({
    value: buyAmount,
    inputExponent: buyAsset.precision,
    outputExponent: sellAsset.precision,
  })
    .dividedBy(bn(sellAmount))
    .toFixed()
}
```

---

## 5. utils/[swapperName]Service.ts

```typescript
import axios from 'axios'
import { makeSwapperAxiosServiceMonadic } from '../../../utils'

export const [swapperName]ServiceFactory = ({ apiKey }: { apiKey: string }) => {
  const axiosInstance = axios.create({
    timeout: 10000,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      // Adjust header name based on API:
      'x-api-key': apiKey,
      // OR: 'Authorization': `Bearer ${apiKey}`,
      // OR: no auth header needed
    },
  })

  return makeSwapperAxiosServiceMonadic(axiosInstance)
}
```

---

## 6. utils/fetchFrom[SwapperName].ts

```typescript
import type { Asset } from '@shapeshiftoss/types'
import { bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { Address } from 'viem'
import { getAddress } from 'viem'

import type { SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { [SwapperName]QuoteResponse, [SwapperName]SupportedChainId } from '../types'
import { [SWAPPER]_DUMMY_ADDRESS, chainIdTo[SwapperName]Chain } from '../types'
import { [swapperName]ServiceFactory } from './[swapperName]Service'
import { assetIdTo[SwapperName]Token } from './helpers/helpers'

export const fetch[SwapperName]Quote = async ({
  buyAsset,
  sellAsset,
  sellAmountIncludingProtocolFeesCryptoBaseUnit,
  takerAddress,
  receiverAddress,
  slippageTolerancePercentageDecimal,
  affiliateBps,
  apiKey,
}: {
  buyAsset: Asset
  sellAsset: Asset
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  takerAddress: Address
  receiverAddress: Address
  slippageTolerancePercentageDecimal: string
  affiliateBps?: string
  apiKey: string
}): Promise<Result<[SwapperName]QuoteResponse, SwapErrorRight>> => {
  try {
    const sellToken = assetIdTo[SwapperName]Token(sellAsset.assetId)
    const buyToken = assetIdTo[SwapperName]Token(buyAsset.assetId)
    const checksummedTakerAddress = getAddress(takerAddress)
    const checksummedReceiverAddress = getAddress(receiverAddress)
    const chainName = chainIdTo[SwapperName]Chain[sellAsset.chainId as [SwapperName]SupportedChainId]
    const sellAmountFormatted = bn(sellAmountIncludingProtocolFeesCryptoBaseUnit).toFixed(0)

    // CRITICAL: Adjust slippage format based on API!
    // Option 1: API expects percentage (1 = 1%)
    const slippagePercentage = bn(slippageTolerancePercentageDecimal ?? 0.005)
      .times(100)
      .toNumber()

    // Option 2: API expects decimal (0.01 = 1%)
    // const slippageDecimal = bn(slippageTolerancePercentageDecimal ?? 0.005).toNumber()

    // Option 3: API expects basis points (100 = 1%)
    // const slippageBps = bn(slippageTolerancePercentageDecimal ?? 0.005).times(10000).toNumber()

    // Build URL and params based on API structure
    const url = `https://api.example.com/${chainName}/v1/quote`

    const params = new URLSearchParams({
      sell_token: sellToken,
      buy_token: buyToken,
      sell_amount: sellAmountFormatted,
      taker_address: checksummedTakerAddress,
      receiver_address: checksummedReceiverAddress,
      slippage: slippagePercentage.toString(), // Adjust based on API
      // Add other required params
    })

    // Add affiliate fee if provided
    if (affiliateBps && affiliateBps !== '0') {
      params.set('fee', affiliateBps)
    }

    const service = [swapperName]ServiceFactory({ apiKey })
    const maybeResponse = await service.get<[SwapperName]QuoteResponse>(`${url}?${params}`)

    if (maybeResponse.isErr()) {
      return Err(
        makeSwapErrorRight({
          message: 'Failed to fetch quote',
          cause: maybeResponse.unwrapErr().cause,
          code: TradeQuoteError.QueryFailed,
        }),
      )
    }

    const response = maybeResponse.unwrap()

    // Validate response structure
    if (!response.data /* add validation logic */) {
      return Err(
        makeSwapErrorRight({
          message: 'Invalid response',
          code: TradeQuoteError.InvalidResponse,
        }),
      )
    }

    return Ok(response.data)
  } catch (error) {
    return Err(
      makeSwapErrorRight({
        message: 'Unexpected error fetching quote',
        cause: error,
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }
}

// Rate fetch function (uses dummy address when no wallet)
export const fetch[SwapperName]Price = ({
  buyAsset,
  sellAsset,
  sellAmountIncludingProtocolFeesCryptoBaseUnit,
  receiveAddress,
  affiliateBps,
  apiKey,
}: {
  buyAsset: Asset
  sellAsset: Asset
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  receiveAddress: string | undefined
  affiliateBps?: string
  apiKey: string
}): Promise<Result<[SwapperName]QuoteResponse, SwapErrorRight>> => {
  const address = (receiveAddress as Address | undefined) || [SWAPPER]_DUMMY_ADDRESS

  return fetch[SwapperName]Quote({
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    takerAddress: address,
    receiverAddress: address,
    slippageTolerancePercentageDecimal: '0.01',
    affiliateBps, // IMPORTANT: Pass affiliate fees to BOTH quote and rate!
    apiKey,
  })
}
```

---

## 7. get[SwapperName]TradeQuote.ts

```typescript
import type { ChainId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { evm } from '@shapeshiftoss/chain-adapters'
import type { AssetsByIdPartial } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'
import type { Address } from 'viem'
import { fromHex, isAddress } from 'viem'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  GetEvmTradeQuoteInputBase,
  SingleHopTradeQuoteSteps,
  SwapErrorRight,
  TradeQuote,
  TradeQuoteStep,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import { [SWAPPER]_DUMMY_ADDRESS } from '../types'
import { fetch[SwapperName]Quote } from '../utils/fetchFrom[SwapperName]'
import { assertValidTrade, calculateRate } from '../utils/helpers/helpers'

export async function get[SwapperName]TradeQuote(
  input: GetEvmTradeQuoteInputBase,
  assertGetEvmChainAdapter: (chainId: ChainId) => EvmChainAdapter,
  _assetsById: AssetsByIdPartial,
  apiKey: string,
): Promise<Result<TradeQuote, SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    accountNumber,
    sendAddress,
    receiveAddress,
    affiliateBps,
    chainId,
    supportsEIP1559,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  } = input

  // Validate trade is possible
  const assertion = assertValidTrade({ buyAsset, sellAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const takerAddress = (sendAddress || receiveAddress) as Address

  // Prevent using dummy address for executable quotes
  if (takerAddress === [SWAPPER]_DUMMY_ADDRESS) {
    return Err(
      makeSwapErrorRight({
        message: 'Cannot execute quote with dummy address - wallet required',
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.[SwapperName])

  // Fetch quote from API
  const maybeQuoteResponse = await fetch[SwapperName]Quote({
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    takerAddress,
    receiverAddress: receiveAddress as Address,
    slippageTolerancePercentageDecimal,
    affiliateBps,
    apiKey,
  })

  if (maybeQuoteResponse.isErr()) return Err(maybeQuoteResponse.unwrapErr())
  const quoteResponse = maybeQuoteResponse.unwrap()

  // Extract amounts from response
  // CUSTOMIZE based on actual API response structure!
  const sellAmount = /* extract from quoteResponse */
  const buyAmount = /* extract from quoteResponse */

  // Build transaction metadata
  const transactionMetadata: TradeQuoteStep['[swapperName]TransactionMetadata'] = {
    to: /* from response */,
    data: /* from response */,
    value: /* from response */,
    gas: /* from response */,
  }

  const rate = calculateRate({ buyAmount, sellAmount, buyAsset, sellAsset })

  try {
    const adapter = assertGetEvmChainAdapter(chainId)
    const { average } = await adapter.getGasFeeData()

    // Convert gas limit from hex if API returns hex
    // const gasLimitFromQuote = quote.tx.gas
    //   ? fromHex(quote.tx.gas as Hex, 'bigint').toString()
    //   : '0'

    const networkFeeCryptoBaseUnit = evm.calcNetworkFeeCryptoBaseUnit({
      ...average,
      supportsEIP1559: Boolean(supportsEIP1559),
      gasLimit: /* gas limit from quote or calculation */,
    })

    return Ok({
      id: uuid(),
      quoteOrRate: 'quote' as const,
      receiveAddress,
      affiliateBps,
      slippageTolerancePercentageDecimal,
      rate,
      swapperName: SwapperName.[SwapperName],
      steps: [
        {
          estimatedExecutionTimeMs: 0,
          allowanceContract: isNativeEvmAsset(sellAsset.assetId)
            ? undefined
            : /* approval contract from response or constant */,
          buyAsset,
          sellAsset,
          accountNumber,
          rate,
          feeData: {
            protocolFees: {}, // Or calculate from response
            networkFeeCryptoBaseUnit,
          },
          buyAmountBeforeFeesCryptoBaseUnit: buyAmount,
          buyAmountAfterFeesCryptoBaseUnit: buyAmount,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          source: SwapperName.[SwapperName],
          [swapperName]TransactionMetadata: transactionMetadata,
        },
      ] as SingleHopTradeQuoteSteps,
    })
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: 'Failed to get fee data',
        cause: err,
        code: TradeQuoteError.NetworkFeeEstimationFailed,
      }),
    )
  }
}
```

---

## 8. get[SwapperName]TradeRate.ts

Similar to getTradeQuote but:
- Returns `'rate'` instead of `'quote'`
- No transaction metadata needed
- Can use API gas estimates directly
- Uses dummy address if no wallet

```typescript
// Structure similar to getTradeQuote
// Key differences:
return Ok({
  // ... same fields ...
  quoteOrRate: 'rate' as const,
  accountNumber: undefined, // Rates don't have accounts
})
```

---

## 9. endpoints.ts

```typescript
import { evm } from '@shapeshiftoss/chain-adapters'
import BigNumber from 'bignumber.js'
import type { GetEvmTradeQuoteInputBase, GetEvmTradeRateInput, SwapperApi } from '../../types'
import { checkEvmSwapStatus, getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import { get[SwapperName]TradeQuote } from './get[SwapperName]TradeQuote/get[SwapperName]TradeQuote'
import { get[SwapperName]TradeRate } from './get[SwapperName]TradeRate/get[SwapperName]TradeRate'

export const [swapperName]Api: SwapperApi = {
  getTradeQuote: async (input, { assertGetEvmChainAdapter, config, assetsById }) => {
    const tradeQuoteResult = await get[SwapperName]TradeQuote(
      input as GetEvmTradeQuoteInputBase,
      assertGetEvmChainAdapter,
      assetsById,
      config.VITE_[SWAPPER]_API_KEY,
    )

    return tradeQuoteResult.map(tradeQuote => [tradeQuote])
  },

  getTradeRate: async (input, { config, assetsById }) => {
    const tradeRateResult = await get[SwapperName]TradeRate(
      input as GetEvmTradeRateInput,
      assetsById,
      config.VITE_[SWAPPER]_API_KEY,
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
    if (!isExecutableTradeQuote(tradeQuote)) {
      throw new Error('Unable to execute a trade rate quote')
    }

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { accountNumber, sellAsset, [swapperName]TransactionMetadata } = step
    if (![swapperName]TransactionMetadata) {
      throw new Error('Transaction metadata is required')
    }

    const { value, to, data, gas } = [swapperName]TransactionMetadata

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

    const feeData = await evm.getFees({ adapter, data, to, value, from, supportsEIP1559 })

    return adapter.buildCustomApiTx({
      accountNumber,
      data,
      from,
      to,
      value,
      ...feeData,
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
    if (!isExecutableTradeQuote(tradeQuote)) {
      throw new Error('Unable to execute a trade rate quote')
    }

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { sellAsset, [swapperName]TransactionMetadata } = step
    if (![swapperName]TransactionMetadata) {
      throw new Error('Transaction metadata is required')
    }

    const { value, to, data } = [swapperName]TransactionMetadata

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

    const feeData = await evm.getFees({ adapter, data, to, value, from, supportsEIP1559 })

    return feeData.networkFeeCryptoBaseUnit
  },

  checkTradeStatus: checkEvmSwapStatus,
}
```

---

## 10. [SwapperName]Swapper.ts

```typescript
import type { Swapper } from '../../types'
import { executeEvmTransaction } from '../../utils'

export const [swapperName]Swapper: Swapper = {
  executeEvmTransaction,
}
```

---

## Registration in constants.ts

```typescript
// In packages/swapper/src/constants.ts

import { [swapperName]Swapper } from './swappers/[SwapperName]Swapper/[SwapperName]Swapper'
import { [swapperName]Api } from './swappers/[SwapperName]Swapper/endpoints'

// Add to SwapperName enum
export enum SwapperName {
  // ... existing swappers
  [SwapperName] = '[SwapperName]',
}

// Add to swappers record
export const swappers: Record<SwapperName, (SwapperApi & Swapper) | undefined> = {
  // ... existing swappers
  [SwapperName.[SwapperName]]: {
    ...[swapperName]Swapper,
    ...[swapperName]Api,
  },
}

// Add default slippage
const DEFAULT_[SWAPPER]_SLIPPAGE_DECIMAL_PERCENTAGE = '0.005' // 0.5%

// Update getDefaultSlippageDecimalPercentageForSwapper
export const getDefaultSlippageDecimalPercentageForSwapper = (
  swapperName: SwapperName | undefined,
): string => {
  switch (swapperName) {
    // ... existing cases
    case SwapperName.[SwapperName]:
      return DEFAULT_[SWAPPER]_SLIPPAGE_DECIMAL_PERCENTAGE
    default:
      return DEFAULT_SLIPPAGE_DECIMAL_PERCENTAGE
  }
}
```

---

## Types Registration

```typescript
// In packages/swapper/src/types.ts

// Add to SwapperConfig
export type SwapperConfig = {
  // ... existing config
  VITE_[SWAPPER]_API_KEY: string
  VITE_[SWAPPER]_BASE_URL: string
}

// Add to TradeQuoteStep (if using custom metadata)
export type TradeQuoteStep = {
  // ... existing fields
  [swapperName]TransactionMetadata?: {
    to: string
    from?: string
    data: string
    value: string
    gas?: string
  }
}
```

---

These templates provide a starting point. Always **adapt based on**:
- Actual API response structure
- Swapper-specific requirements
- Patterns from similar existing swappers
