import type { ChainId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { evm } from '@shapeshiftoss/chain-adapters'
import { PERMIT2_CONTRACT } from '@shapeshiftoss/contracts'
import type { AssetsByIdPartial } from '@shapeshiftoss/types'
import { bn, bnOrZero, convertPrecision } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  GetEvmTradeQuoteInput,
  SingleHopTradeQuoteSteps,
  SwapErrorRight,
  TradeQuote,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { ZRC_PERMIT2_SOURCE_ID } from '../utils/constants'
import { fetchFromZrx, fetchFromZrxPermit2 } from '../utils/fetchFromZrx'
import { assetToToken, isSupportedChainId, tokenToAssetId } from '../utils/helpers/helpers'

export function getZrxTradeQuote(
  input: GetEvmTradeQuoteInput,
  assertGetEvmChainAdapter: (chainId: ChainId) => EvmChainAdapter,
  isPermit2Enabled: boolean,
  assetsById: AssetsByIdPartial,
): Promise<Result<TradeQuote, SwapErrorRight>> {
  if (!isPermit2Enabled) return _getZrxTradeQuote(input, assertGetEvmChainAdapter)
  return _getZrxPermit2TradeQuote(input, assertGetEvmChainAdapter, assetsById)
}

async function _getZrxTradeQuote(
  input: GetEvmTradeQuoteInput,
  assertGetEvmChainAdapter: (chainId: ChainId) => EvmChainAdapter,
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

  const maybeZrxPriceResponse = await fetchFromZrx({
    priceOrQuote: 'price',
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    receiveAddress,
    affiliateBps,
    slippageTolerancePercentageDecimal,
  })

  if (maybeZrxPriceResponse.isErr()) return Err(maybeZrxPriceResponse.unwrapErr())
  const zrxQuoteResponse = maybeZrxPriceResponse.unwrap()

  const {
    buyAmount: buyAmountAfterFeesCryptoBaseUnit,
    grossBuyAmount: buyAmountBeforeFeesCryptoBaseUnit,
    price,
    allowanceTarget,
    gas,
    expectedSlippage,
  } = zrxQuoteResponse

  const useSellAmount = !!sellAmountIncludingProtocolFeesCryptoBaseUnit
  const rate = useSellAmount ? price : bn(1).div(price).toString()

  // 0x approvals are cheaper than trades, but we don't have dynamic quote data for them.
  // Instead, we use a hardcoded gasLimit estimate in place of the estimatedGas in the 0x quote response.
  try {
    const adapter = assertGetEvmChainAdapter(chainId)
    const { average } = await adapter.getGasFeeData()
    const networkFeeCryptoBaseUnit = evm.calcNetworkFeeCryptoBaseUnit({
      ...average,
      supportsEIP1559,
      // add gas limit buffer to account for the fact we perform all of our validation on the trade quote estimations
      // which are inaccurate and not what we use for the tx to broadcast
      gasLimit: bnOrZero(gas).times(1.2).toFixed(),
    })

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

async function _getZrxPermit2TradeQuote(
  input: GetEvmTradeQuoteInput,
  assertGetEvmChainAdapter: (chainId: ChainId) => EvmChainAdapter,
  assetsById: AssetsByIdPartial,
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

  const maybeZrxPriceResponse = await fetchFromZrxPermit2({
    priceOrQuote: 'price',
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    receiveAddress,
    affiliateBps,
    slippageTolerancePercentageDecimal,
  })

  if (maybeZrxPriceResponse.isErr()) return Err(maybeZrxPriceResponse.unwrapErr())
  const zrxQuoteResponse = maybeZrxPriceResponse.unwrap()

  const { sellAmount, buyAmount, gas, fees } = zrxQuoteResponse

  // for the rate to be valid, both amounts must be converted to the same precision
  const rate = convertPrecision({
    value: buyAmount,
    inputExponent: buyAsset.precision,
    outputExponent: sellAsset.precision,
  })
    .dividedBy(bn(sellAmount))
    .toFixed()

  // The integrator fee is set to the buy asset in fetchFromZrxPermit2, but paranoia
  if (fees.integratorFee !== null && fees.integratorFee.token !== assetToToken(buyAsset)) {
    return Err(
      makeSwapErrorRight({
        message: `Unhandled integrator fee asset '${fees.integratorFee.token}'`,
        code: TradeQuoteError.CrossChainNotSupported,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  // We can safely add the integrator fee now we know its the correct asset.
  const integratorFee = fees.integratorFee?.amount ?? '0'
  const buyAmountBeforeFeesCryptoBaseUnit = bn(buyAmount).plus(integratorFee).toFixed()

  // 0x approvals are cheaper than trades, but we don't have dynamic quote data for them.
  // Instead, we use a hardcoded gasLimit estimate in place of the estimatedGas in the 0x quote response.
  try {
    const adapter = assertGetEvmChainAdapter(chainId)
    const { average } = await adapter.getGasFeeData()
    const networkFeeCryptoBaseUnit = evm.calcNetworkFeeCryptoBaseUnit({
      ...average,
      supportsEIP1559,
      // add gas limit buffer to account for the fact we perform all of our validation on the trade quote estimations
      // which are inaccurate and not what we use for the tx to broadcast
      gasLimit: bnOrZero(gas).times(1.2).toFixed(),
    })

    const protocolFees = (() => {
      if (!fees.zeroExFee) return {}

      const assetId = tokenToAssetId(fees.zeroExFee.token, sellAsset.chainId)

      return {
        [assetId]: {
          requiresBalance: true,
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
          allowanceContract: PERMIT2_CONTRACT,
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
          source: ZRC_PERMIT2_SOURCE_ID,
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
