import type { ChainId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { evm } from '@shapeshiftoss/chain-adapters'
import { PERMIT2_CONTRACT } from '@shapeshiftoss/contracts'
import type { AssetsByIdPartial } from '@shapeshiftoss/types'
import { bn, bnOrZero, convertPrecision } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { TypedData } from 'eip-712'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  GetEvmTradeQuoteInput,
  GetEvmTradeRateInput,
  SingleHopTradeQuoteSteps,
  SingleHopTradeRateSteps,
  SwapErrorRight,
  TradeQuote,
  TradeQuoteStep,
  TradeRate,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import {
  fetchZrxPermit2Price,
  fetchZrxPermit2Quote,
  fetchZrxPrice,
  fetchZrxQuote,
} from '../utils/fetchFromZrx'
import { assetIdToZrxToken, isSupportedChainId, zrxTokenToAssetId } from '../utils/helpers/helpers'

// We can' just split between quotes and rates just yet, but need a temporary notion of a "quote which is actually a rate which is acting like a quote".
// This is because of (classic, not permit2 ZRX) being v. weird
// I've lost too many brain cells with the current flow, and we *have* to have some intermediary notion of a "pseudo-quote", or however we want to call it.
// The reason why we need this:
// - Current getTradeQuote endpoint actually calls the `/price` endpoint, which seems relatively simple to tackle and seemingly just a rename needed.
// - However, we then use the `gas` (gasLimit) property and factor supportsEIP1559 to do pseudo-fees calculation
// This means that the current implementation isn't really a rate (requires quote input), but not really a quote either (we don't fetch the quote endpoint),
// and to avoid breaking changes in the interim, we've renamed the current `_getTradeQuote` implementation to this
// TODO(gomes): ditch this when wiring things up, and bring sanity back to the world
export function getZrxPseudoTradeQuote(
  input: GetEvmTradeQuoteInput,
  assertGetEvmChainAdapter: (chainId: ChainId) => EvmChainAdapter,
  isPermit2Enabled: boolean,
  assetsById: AssetsByIdPartial,
  zrxBaseUrl: string,
): Promise<Result<TradeQuote, SwapErrorRight>> {
  if (!isPermit2Enabled) return _getZrxTradeQuote(input, assertGetEvmChainAdapter, zrxBaseUrl)
  return _getZrxPermit2TradeQuote(input, assertGetEvmChainAdapter, assetsById, zrxBaseUrl)
}

export function getZrxTradeQuote(
  input: GetEvmTradeQuoteInput,
  assertGetEvmChainAdapter: (chainId: ChainId) => EvmChainAdapter,
  isPermit2Enabled: boolean,
  assetsById: AssetsByIdPartial,
  zrxBaseUrl: string,
): Promise<Result<TradeQuote, SwapErrorRight>> {
  if (!isPermit2Enabled) return _getZrxTradePseudoQuote(input, assertGetEvmChainAdapter, zrxBaseUrl)
  return _getZrxPermit2TradeQuote(input, assertGetEvmChainAdapter, assetsById, zrxBaseUrl)
}

export function getZrxTradeRate(
  input: GetEvmTradeRateInput,
  assertGetEvmChainAdapter: (chainId: ChainId) => EvmChainAdapter,
  isPermit2Enabled: boolean,
  assetsById: AssetsByIdPartial,
  zrxBaseUrl: string,
): Promise<Result<TradeRate, SwapErrorRight>> {
  if (!isPermit2Enabled) return _getZrxTradeRate(input, assertGetEvmChainAdapter, zrxBaseUrl)
  return _getZrxPermit2TradeRate(input, assertGetEvmChainAdapter, assetsById, zrxBaseUrl)
}

// TODO(gomes): temporary concept for the purpose of being non-breaking, remove me, this really gets a rate
async function _getZrxTradePseudoQuote(
  input: GetEvmTradeQuoteInput,
  assertGetEvmChainAdapter: (chainId: ChainId) => EvmChainAdapter,
  zrxBaseUrl: string,
): Promise<Result<TradeQuote, SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    accountNumber,
    receiveAddress,
    affiliateBps,
    potentialAffiliateBps,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    supportsEIP1559,
    chainId,
  } = input

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Zrx)

  const sellAssetChainId = sellAsset.chainId
  const buyAssetChainId = buyAsset.chainId

  if (!isSupportedChainId(sellAssetChainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (!isSupportedChainId(buyAssetChainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (sellAssetChainId !== buyAssetChainId) {
    return Err(
      makeSwapErrorRight({
        message: `cross-chain not supported - both assets must be on chainId ${sellAsset.chainId}`,
        code: TradeQuoteError.CrossChainNotSupported,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  const maybeZrxPriceResponse = await fetchZrxPrice({
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    receiveAddress,
    affiliateBps,
    slippageTolerancePercentageDecimal,
    zrxBaseUrl,
  })

  if (maybeZrxPriceResponse.isErr()) return Err(maybeZrxPriceResponse.unwrapErr())
  const zrxPriceResponse = maybeZrxPriceResponse.unwrap()

  const {
    buyAmount: buyAmountAfterFeesCryptoBaseUnit,
    grossBuyAmount: buyAmountBeforeFeesCryptoBaseUnit,
    price,
    allowanceTarget,
    gas,
    expectedSlippage,
  } = zrxPriceResponse

  const useSellAmount = !!sellAmountIncludingProtocolFeesCryptoBaseUnit
  const rate = useSellAmount ? price : bn(1).div(price).toString()

  const adapter = assertGetEvmChainAdapter(chainId)
  const { average } = await adapter.getGasFeeData()

  const networkFeeCryptoBaseUnit = evm.calcNetworkFeeCryptoBaseUnit({
    ...average,
    supportsEIP1559: Boolean(supportsEIP1559),
    // add gas limit buffer to account for the fact we perform all of our validation on the trade quote estimations
    // which are inaccurate and not what we use for the tx to broadcast
    gasLimit: bnOrZero(gas).times(1.2).toFixed(),
  })

  // 0x approvals are cheaper than trades, but we don't have dynamic quote data for them.
  // Instead, we use a hardcoded gasLimit estimate in place of the estimatedGas in the 0x quote response.
  try {
    return Ok({
      id: uuid(),
      receiveAddress,
      potentialAffiliateBps,
      affiliateBps,
      // Slippage protection is only provided for specific pairs.
      // If slippage protection is not provided, assume a no slippage limit.
      // If slippage protection is provided, return the limit instead of the estimated slippage.
      // https://0x.org/docs/0x-swap-api/api-references/get-swap-v1-quote
      slippageTolerancePercentageDecimal: expectedSlippage
        ? slippageTolerancePercentageDecimal
        : undefined,
      rate,
      steps: [
        {
          estimatedExecutionTimeMs: undefined,
          allowanceContract: allowanceTarget,
          buyAsset,
          sellAsset,
          accountNumber,
          rate,
          feeData: {
            protocolFees: {},
            networkFeeCryptoBaseUnit, // L1 fee added inside of evm.calcNetworkFeeCryptoBaseUnit
          },
          buyAmountBeforeFeesCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          source: SwapperName.Zrx,
        },
      ] as SingleHopTradeQuoteSteps,
    })
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: 'failed to get fee data',
        cause: err,
        code: TradeQuoteError.NetworkFeeEstimationFailed,
      }),
    )
  }
}

async function _getZrxTradeQuote(
  input: GetEvmTradeQuoteInput,
  _assertGetEvmChainAdapter: (chainId: ChainId) => EvmChainAdapter,
  zrxBaseUrl: string,
): Promise<Result<TradeQuote, SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    accountNumber,
    receiveAddress,
    affiliateBps,
    potentialAffiliateBps,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  } = input

  if (!receiveAddress) throw new Error('Cannot get a trade quote without a receive address')
  if (accountNumber === undefined)
    throw new Error('Cannot get a trade quote without an account number')

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Zrx)

  const sellAssetChainId = sellAsset.chainId
  const buyAssetChainId = buyAsset.chainId

  if (!isSupportedChainId(sellAssetChainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (!isSupportedChainId(buyAssetChainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (sellAssetChainId !== buyAssetChainId) {
    return Err(
      makeSwapErrorRight({
        message: `cross-chain not supported - both assets must be on chainId ${sellAsset.chainId}`,
        code: TradeQuoteError.CrossChainNotSupported,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  const maybeZrxQuoteResponse = await fetchZrxQuote({
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    receiveAddress,
    affiliateBps,
    slippageTolerancePercentageDecimal,
    zrxBaseUrl,
  })

  if (maybeZrxQuoteResponse.isErr()) return Err(maybeZrxQuoteResponse.unwrapErr())
  const zrxPriceResponse = maybeZrxQuoteResponse.unwrap()

  const {
    buyAmount: buyAmountAfterFeesCryptoBaseUnit,
    grossBuyAmount: buyAmountBeforeFeesCryptoBaseUnit,
    price,
    allowanceTarget,
    estimatedGas,
    gasPrice,
    expectedSlippage,
  } = zrxPriceResponse

  const useSellAmount = !!sellAmountIncludingProtocolFeesCryptoBaseUnit
  const rate = useSellAmount ? price : bn(1).div(price).toString()

  // 0x approvals are cheaper than trades, but we don't have dynamic quote data for them.
  // Instead, we use a hardcoded gasLimit estimate in place of the estimatedGas in the 0x quote response.
  try {
    return Ok({
      id: uuid(),
      receiveAddress,
      potentialAffiliateBps,
      affiliateBps,
      // Slippage protection is only provided for specific pairs.
      // If slippage protection is not provided, assume a no slippage limit.
      // If slippage protection is provided, return the limit instead of the estimated slippage.
      // https://0x.org/docs/0x-swap-api/api-references/get-swap-v1-quote
      slippageTolerancePercentageDecimal: expectedSlippage
        ? slippageTolerancePercentageDecimal
        : undefined,
      rate,
      steps: [
        {
          estimatedExecutionTimeMs: undefined,
          allowanceContract: allowanceTarget,
          buyAsset,
          sellAsset,
          accountNumber,
          rate,
          feeData: {
            protocolFees: {},
            networkFeeCryptoBaseUnit: bn(estimatedGas).times(gasPrice).toFixed(), // TODO(gomes): do we still care about L1 fees here?
          },
          buyAmountBeforeFeesCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          source: SwapperName.Zrx,
        },
      ] as SingleHopTradeQuoteSteps,
    })
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: 'failed to get fee data',
        cause: err,
        code: TradeQuoteError.NetworkFeeEstimationFailed,
      }),
    )
  }
}

async function _getZrxTradeRate(
  input: GetEvmTradeRateInput,
  assertGetEvmChainAdapter: (chainId: ChainId) => EvmChainAdapter,
  zrxBaseUrl: string,
): Promise<Result<TradeRate, SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    accountNumber,
    receiveAddress,
    affiliateBps,
    potentialAffiliateBps,
    chainId,
    supportsEIP1559,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  } = input

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Zrx)

  const sellAssetChainId = sellAsset.chainId
  const buyAssetChainId = buyAsset.chainId

  if (!isSupportedChainId(sellAssetChainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (!isSupportedChainId(buyAssetChainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (sellAssetChainId !== buyAssetChainId) {
    return Err(
      makeSwapErrorRight({
        message: `cross-chain not supported - both assets must be on chainId ${sellAsset.chainId}`,
        code: TradeQuoteError.CrossChainNotSupported,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  const maybeZrxPriceResponse = await fetchZrxPrice({
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    receiveAddress,
    affiliateBps,
    slippageTolerancePercentageDecimal,
    zrxBaseUrl,
  })

  if (maybeZrxPriceResponse.isErr()) return Err(maybeZrxPriceResponse.unwrapErr())
  const zrxPriceResponse = maybeZrxPriceResponse.unwrap()

  const {
    buyAmount: buyAmountAfterFeesCryptoBaseUnit,
    grossBuyAmount: buyAmountBeforeFeesCryptoBaseUnit,
    price,
    allowanceTarget,
    gas,
    expectedSlippage,
  } = zrxPriceResponse

  const useSellAmount = !!sellAmountIncludingProtocolFeesCryptoBaseUnit
  const rate = useSellAmount ? price : bn(1).div(price).toString()

  // 0x approvals are cheaper than trades, but we don't have dynamic quote data for them.
  // Instead, we use a hardcoded gasLimit estimate in place of the estimatedGas in the 0x quote response.
  try {
    const adapter = assertGetEvmChainAdapter(chainId)
    const { average } = await adapter.getGasFeeData()
    const networkFeeCryptoBaseUnit = evm.calcNetworkFeeCryptoBaseUnit({
      ...average,
      supportsEIP1559: Boolean(supportsEIP1559),
      // add gas limit buffer to account for the fact we perform all of our validation on the trade quote estimations
      // which are inaccurate and not what we use for the tx to broadcast
      gasLimit: bnOrZero(gas).times(1.2).toFixed(),
    })

    return Ok({
      id: uuid(),
      accountNumber: undefined,
      receiveAddress,
      potentialAffiliateBps,
      affiliateBps,
      // Slippage protection is only provided for specific pairs.
      // If slippage protection is not provided, assume a no slippage limit.
      // If slippage protection is provided, return the limit instead of the estimated slippage.
      // https://0x.org/docs/0x-swap-api/api-references/get-swap-v1-quote
      slippageTolerancePercentageDecimal: expectedSlippage
        ? slippageTolerancePercentageDecimal
        : undefined,
      rate,
      steps: [
        {
          estimatedExecutionTimeMs: undefined,
          allowanceContract: allowanceTarget,
          buyAsset,
          sellAsset,
          accountNumber,
          rate,
          feeData: {
            protocolFees: {},
            networkFeeCryptoBaseUnit, // TODO(gomes): do we still want to handle L1 fee here for rates, since we leverage upstream fees calcs?
          },
          buyAmountBeforeFeesCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          source: SwapperName.Zrx,
        },
      ] as SingleHopTradeRateSteps,
    })
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: 'failed to get fee data',
        cause: err,
        code: TradeQuoteError.NetworkFeeEstimationFailed,
      }),
    )
  }
}

async function _getZrxPermit2TradeQuote(
  input: GetEvmTradeQuoteInput,
  assertGetEvmChainAdapter: (chainId: ChainId) => EvmChainAdapter,
  assetsById: AssetsByIdPartial,
  zrxBaseUrl: string,
): Promise<Result<TradeQuote, SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    accountNumber,
    receiveAddress,
    affiliateBps,
    potentialAffiliateBps,
    chainId,
    supportsEIP1559,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    hasWallet,
  } = input

  if (!hasWallet) throw new Error('Cannot get a trade quote without a wallet')

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Zrx)

  const sellAssetChainId = sellAsset.chainId
  const buyAssetChainId = buyAsset.chainId

  if (!isSupportedChainId(sellAssetChainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (!isSupportedChainId(buyAssetChainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (sellAssetChainId !== buyAssetChainId) {
    return Err(
      makeSwapErrorRight({
        message: `cross-chain not supported - both assets must be on chainId ${sellAsset.chainId}`,
        code: TradeQuoteError.CrossChainNotSupported,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  const maybeZrxQuoteResponse = await fetchZrxPermit2Quote({
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    receiveAddress,
    affiliateBps,
    slippageTolerancePercentageDecimal,
    zrxBaseUrl,
  })

  if (maybeZrxQuoteResponse.isErr()) return Err(maybeZrxQuoteResponse.unwrapErr())
  const zrxQuoteResponse = maybeZrxQuoteResponse.unwrap()

  const { sellAmount, buyAmount, fees, permit2: quotePermit2, transaction } = zrxQuoteResponse

  const permit2Eip712 = quotePermit2?.eip712

  if (!isNativeEvmAsset(sellAsset.assetId) && !permit2Eip712) {
    return Err(
      makeSwapErrorRight({
        message: 'Missing required Permit2 metadata from 0x response',
        code: TradeQuoteError.InvalidResponse,
        details: { transaction, permit2Eip712 },
      }),
    )
  }

  if (!transaction) {
    return Err(
      makeSwapErrorRight({
        message: 'Missing required transaction metadata from 0x response',
        code: TradeQuoteError.InvalidResponse,
        details: { transaction, permit2Eip712 },
      }),
    )
  }

  const transactionMetadata: TradeQuoteStep['transactionMetadata'] = {
    to: transaction.to,
    data: transaction.data as `0x${string}`,
    gasPrice: transaction.gasPrice ? BigInt(transaction.gasPrice) : undefined,
    gas: transaction.gas ? BigInt(transaction.gas) : undefined,
    value: BigInt(transaction.value),
  }

  // for the rate to be valid, both amounts must be converted to the same precision
  const rate = convertPrecision({
    value: buyAmount,
    inputExponent: buyAsset.precision,
    outputExponent: sellAsset.precision,
  })
    .dividedBy(bn(sellAmount))
    .toFixed()

  // The integrator fee is set to the buy asset in fetchFromZrxPermit2, but paranoia
  if (
    fees.integratorFee !== null &&
    fees.integratorFee.token !== assetIdToZrxToken(buyAsset.assetId)
  ) {
    return Err(
      makeSwapErrorRight({
        message: `Unhandled integrator fee asset '${fees.integratorFee.token}'`,
        code: TradeQuoteError.CrossChainNotSupported,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  // We can safely add the integrator fee now we know its the correct asset.
  const integratorFeeCryptoBaseUnit = fees.integratorFee?.amount ?? '0'
  const buyAmountBeforeFeesCryptoBaseUnit = bn(buyAmount)
    .plus(integratorFeeCryptoBaseUnit)
    .toFixed()

  try {
    const adapter = assertGetEvmChainAdapter(chainId)
    const { average } = await adapter.getGasFeeData()
    const networkFeeCryptoBaseUnit = evm.calcNetworkFeeCryptoBaseUnit({
      ...average,
      supportsEIP1559: Boolean(supportsEIP1559),
      // add gas limit buffer to account for the fact we perform all of our validation on the trade quote estimations
      // which are inaccurate and not what we use for the tx to broadcast
      gasLimit: bnOrZero(transaction.gas).times(1.2).toFixed(),
    })

    const protocolFees = (() => {
      if (!fees.zeroExFee) return {}

      const assetId = zrxTokenToAssetId(fees.zeroExFee.token, sellAsset.chainId)

      return {
        [assetId]: {
          requiresBalance: false,
          amountCryptoBaseUnit: fees.zeroExFee.amount,
          asset: assetsById[assetId],
        },
      }
    })()

    return Ok({
      id: uuid(),
      receiveAddress,
      potentialAffiliateBps,
      affiliateBps,
      // Slippage protection is always enabled for 0x api v2 unlike api v1 which was only supported on specific pairs.
      slippageTolerancePercentageDecimal,
      rate,
      steps: [
        {
          estimatedExecutionTimeMs: undefined,
          allowanceContract: isNativeEvmAsset(sellAsset.assetId) ? undefined : PERMIT2_CONTRACT,
          buyAsset,
          sellAsset,
          accountNumber,
          rate,
          feeData: {
            protocolFees,
            networkFeeCryptoBaseUnit, // L1 fee added inside of evm.calcNetworkFeeCryptoBaseUnit
          },
          buyAmountBeforeFeesCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit: buyAmount,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          source: SwapperName.Zrx,
          permit2Eip712: permit2Eip712 as unknown as TypedData | undefined,
          transactionMetadata,
        },
      ] as SingleHopTradeQuoteSteps,
    })
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: 'failed to get fee data',
        cause: err,
        code: TradeQuoteError.NetworkFeeEstimationFailed,
      }),
    )
  }
}

// TODO(gomes): consume me
async function _getZrxPermit2TradeRate(
  input: GetEvmTradeRateInput,
  _assertGetEvmChainAdapter: (chainId: ChainId) => EvmChainAdapter,
  _assetsById: AssetsByIdPartial,
  zrxBaseUrl: string,
): Promise<Result<TradeRate, SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    accountNumber,
    receiveAddress,
    affiliateBps,
    potentialAffiliateBps,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  } = input

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Zrx)

  const sellAssetChainId = sellAsset.chainId
  const buyAssetChainId = buyAsset.chainId

  if (!isSupportedChainId(sellAssetChainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (!isSupportedChainId(buyAssetChainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (sellAssetChainId !== buyAssetChainId) {
    return Err(
      makeSwapErrorRight({
        message: `cross-chain not supported - both assets must be on chainId ${sellAsset.chainId}`,
        code: TradeQuoteError.CrossChainNotSupported,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  const maybeZrxPriceResponse = await fetchZrxPermit2Price({
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    receiveAddress,
    affiliateBps,
    slippageTolerancePercentageDecimal,
    zrxBaseUrl,
  })

  if (maybeZrxPriceResponse.isErr()) return Err(maybeZrxPriceResponse.unwrapErr())
  const zrxPriceResponse = maybeZrxPriceResponse.unwrap()

  const {
    buyAmount: buyAmountAfterFeesCryptoBaseUnit,
    minBuyAmount: buyAmountBeforeFeesCryptoBaseUnit,
    totalNetworkFee,
  } = zrxPriceResponse

  const rate = bnOrZero(buyAmountAfterFeesCryptoBaseUnit)
    .div(sellAmountIncludingProtocolFeesCryptoBaseUnit)
    .toString()

  // 0x approvals are cheaper than trades, but we don't have dynamic quote data for them.
  // Instead, we use a hardcoded gasLimit estimate in place of the estimatedGas in the 0x quote response.
  const networkFeeCryptoBaseUnit = totalNetworkFee
  return Ok({
    id: uuid(),
    accountNumber: undefined,
    receiveAddress,
    potentialAffiliateBps,
    affiliateBps,
    // Slippage protection is only provided for specific pairs.
    // If slippage protection is not provided, assume a no slippage limit.
    // If slippage protection is provided, return the limit instead of the estimated slippage.
    // https://0x.org/docs/0x-swap-api/api-references/get-swap-v1-quote
    slippageTolerancePercentageDecimal,
    rate,
    steps: [
      {
        estimatedExecutionTimeMs: undefined,
        // We don't care about this - this is a rate, and if we really wanted to, we know the permit2 allowance target
        allowanceContract: undefined,
        buyAsset,
        sellAsset,
        accountNumber,
        rate,
        feeData: {
          protocolFees: {},
          networkFeeCryptoBaseUnit, // L1 fee added inside of evm.calcNetworkFeeCryptoBaseUnit
        },
        buyAmountBeforeFeesCryptoBaseUnit,
        buyAmountAfterFeesCryptoBaseUnit,
        sellAmountIncludingProtocolFeesCryptoBaseUnit,
        source: SwapperName.Zrx,
      },
    ] as unknown as SingleHopTradeRateSteps,
  })
}
