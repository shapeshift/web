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
import type { Address } from 'viem'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  GetEvmTradeQuoteInput,
  GetEvmTradeQuoteInputBase,
  SingleHopTradeQuoteSteps,
  SwapErrorRight,
  TradeQuote,
  TradeQuoteStep,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import { fetchZrxPermit2Quote, fetchZrxQuote } from '../utils/fetchFromZrx'
import { assetIdToZrxToken, isSupportedChainId, zrxTokenToAssetId } from '../utils/helpers/helpers'

export function getZrxTradeQuote(
  input: GetEvmTradeQuoteInputBase,
  assertGetEvmChainAdapter: (chainId: ChainId) => EvmChainAdapter,
  isPermit2Enabled: boolean,
  assetsById: AssetsByIdPartial,
  zrxBaseUrl: string,
): Promise<Result<TradeQuote, SwapErrorRight>> {
  if (!isPermit2Enabled) return _getZrxTradeQuote(input, assertGetEvmChainAdapter, zrxBaseUrl)
  return _getZrxPermit2TradeQuote(input, assertGetEvmChainAdapter, assetsById, zrxBaseUrl)
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
    // Cross-account not supported for ZRX
    sellAddress: receiveAddress,
    affiliateBps,
    slippageTolerancePercentageDecimal,
    zrxBaseUrl,
  })

  if (maybeZrxQuoteResponse.isErr()) return Err(maybeZrxQuoteResponse.unwrapErr())
  const zrxQuoteResponse = maybeZrxQuoteResponse.unwrap()

  const transactionMetadata: TradeQuoteStep['zrxTransactionMetadata'] = {
    to: zrxQuoteResponse.to,
    data: zrxQuoteResponse.data as Address,
    gasPrice: zrxQuoteResponse.gasPrice ? zrxQuoteResponse.gasPrice : undefined,
    gas: zrxQuoteResponse.gas ? zrxQuoteResponse.gas : undefined,
    value: zrxQuoteResponse.value,
  }

  const {
    buyAmount: buyAmountAfterFeesCryptoBaseUnit,
    grossBuyAmount: buyAmountBeforeFeesCryptoBaseUnit,
    price,
    allowanceTarget,
    estimatedGas,
    gasPrice,
    expectedSlippage,
  } = zrxQuoteResponse

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
          zrxTransactionMetadata: transactionMetadata,
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

async function _getZrxPermit2TradeQuote(
  input: GetEvmTradeQuoteInputBase,
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

  const maybeZrxQuoteResponse = await fetchZrxPermit2Quote({
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    // Cross-account not supported for ZRX
    sellAddress: receiveAddress,
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

  const transactionMetadata: TradeQuoteStep['zrxTransactionMetadata'] = {
    to: transaction.to,
    data: transaction.data as Address,
    gasPrice: transaction.gasPrice ? transaction.gasPrice : undefined,
    gas: transaction.gas ? transaction.gas : undefined,
    value: transaction.value,
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
          zrxTransactionMetadata: transactionMetadata,
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
