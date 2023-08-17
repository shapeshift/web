import type { AssetId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import type {
  CosmosSdkBaseAdapter,
  CosmosSdkChainId,
  EvmChainAdapter,
  GetFeeDataInput,
  UtxoBaseAdapter,
} from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getDefaultSlippagePercentageForSwapper } from 'constants/constants'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { baseUnitToPrecision, bn, bnOrZero, convertPrecision } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import type {
  GetEvmTradeQuoteInput,
  GetTradeQuoteInput,
  GetUtxoTradeQuoteInput,
  ProtocolFee,
  SwapErrorRight,
  TradeQuote,
} from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType, SwapperName } from 'lib/swapper/api'
import { getThorTxInfo as getEvmThorTxInfo } from 'lib/swapper/swappers/ThorchainSwapper/evm/utils/getThorTxData'
import type {
  Rates,
  ThorCosmosSdkSupportedChainId,
  ThorEvmSupportedChainId,
  ThorUtxoSupportedChainId,
} from 'lib/swapper/swappers/ThorchainSwapper/types'
import { THORCHAIN_FIXED_PRECISION } from 'lib/swapper/swappers/ThorchainSwapper/utils/constants'
import { getQuote } from 'lib/swapper/swappers/ThorchainSwapper/utils/getQuote/getQuote'
import { getUtxoTxFees } from 'lib/swapper/swappers/ThorchainSwapper/utils/txFeeHelpers/utxoTxFees/getUtxoTxFees'
import { getThorTxInfo as getUtxoThorTxInfo } from 'lib/swapper/swappers/ThorchainSwapper/utxo/utils/getThorTxData'

import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import { getEvmTxFees } from '../utils/txFeeHelpers/evmTxFees/getEvmTxFees'

export type ThorEvmTradeQuote = TradeQuote<ThorEvmSupportedChainId> & {
  router: string
  data: string
}

type ThorTradeQuote =
  | TradeQuote<ThorCosmosSdkSupportedChainId>
  | TradeQuote<ThorUtxoSupportedChainId>
  | ThorEvmTradeQuote

export const getThorTradeQuote = async (
  input: GetTradeQuoteInput & { wallet?: HDWallet },
  rates: Rates,
): Promise<Result<ThorTradeQuote, SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
    slippageTolerancePercentage,
    accountNumber,
    chainId,
    receiveAddress,
    affiliateBps,
    wallet,
  } = input

  const slippageTolerance =
    slippageTolerancePercentage ?? getDefaultSlippagePercentageForSwapper(SwapperName.Thorchain)

  const { buyAssetUsdRate, feeAssetUsdRate } = rates

  const { chainId: buyAssetChainId } = fromAssetId(buyAsset.assetId)

  const chainAdapterManager = getChainAdapterManager()
  const sellAdapter = chainAdapterManager.get(chainId)
  const buyAdapter = chainAdapterManager.get(buyAssetChainId)

  if (!sellAdapter || !buyAdapter) {
    return Err(
      makeSwapErrorRight({
        message: `[getThorTradeQuote] - No chain adapter found for ${chainId} or ${buyAssetChainId}.`,
        code: SwapErrorType.UNSUPPORTED_CHAIN,
        details: { sellAssetChainId: chainId, buyAssetChainId },
      }),
    )
  }

  if (!receiveAddress) {
    return Err(
      makeSwapErrorRight({
        message: '[getThorTradeQuote]: receiveAddress is required',
        code: SwapErrorType.MISSING_INPUT,
      }),
    )
  }

  const maybeQuote = await getQuote({
    sellAsset,
    buyAssetId: buyAsset.assetId,
    sellAmountCryptoBaseUnit,
    receiveAddress,
    affiliateBps,
  })

  if (maybeQuote.isErr()) return Err(maybeQuote.unwrapErr())

  const thornodeQuote = maybeQuote.unwrap()
  const {
    slippage_bps: slippageBps,
    fees,
    expected_amount_out: expectedAmountOutThorBaseUnit,
  } = thornodeQuote

  const slippagePercentage = bn(slippageBps).div(1000)

  const rate = (() => {
    const THOR_PRECISION = 8
    const sellAmountCryptoPrecision = baseUnitToPrecision({
      value: sellAmountCryptoBaseUnit,
      inputExponent: sellAsset.precision,
    })
    // All thorchain pool amounts are base 8 regardless of token precision
    const sellAmountCryptoThorBaseUnit = bn(toBaseUnit(sellAmountCryptoPrecision, THOR_PRECISION))

    return bnOrZero(expectedAmountOutThorBaseUnit).div(sellAmountCryptoThorBaseUnit).toFixed()
  })()

  const buyAssetTradeFeeBuyAssetCryptoThorPrecision = bnOrZero(fees.outbound)

  const buyAssetTradeFeeBuyAssetCryptoBaseUnit = convertPrecision({
    value: buyAssetTradeFeeBuyAssetCryptoThorPrecision,
    inputExponent: THORCHAIN_FIXED_PRECISION,
    outputExponent: buyAsset.precision,
  })

  // Because the expected_amount_out is the amount after fees, we need to add them back on to get the "before fees" amount
  const buyAmountCryptoBaseUnit = (() => {
    // Add back the outbound fees
    const expectedAmountPlusFeesCryptoThorBaseUnit = bn(expectedAmountOutThorBaseUnit)
      .plus(fees.outbound)
      .plus(fees.affiliate)

    return toBaseUnit(
      fromBaseUnit(expectedAmountPlusFeesCryptoThorBaseUnit, THORCHAIN_FIXED_PRECISION),
      buyAsset.precision,
    )
  })()

  const commonQuoteFields = {
    recommendedSlippage: slippagePercentage.div(100).toString(),
  }

  const commonStepFields = {
    rate,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
    buyAmountBeforeFeesCryptoBaseUnit: buyAmountCryptoBaseUnit,
    sources: [{ name: SwapperName.Thorchain, proportion: '1' }],
    buyAsset,
    sellAsset,
    accountNumber,
  }

  const protocolFees: Record<AssetId, ProtocolFee> = {}

  if (!buyAssetTradeFeeBuyAssetCryptoBaseUnit.isZero()) {
    protocolFees[buyAsset.assetId] = {
      amountCryptoBaseUnit: buyAssetTradeFeeBuyAssetCryptoBaseUnit.toString(),
      requiresBalance: false,
      asset: buyAsset,
    }
  }

  const { chainNamespace } = fromAssetId(sellAsset.assetId)
  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Evm:
      return (async (): Promise<Promise<Result<ThorEvmTradeQuote, SwapErrorRight>>> => {
        const maybeThorTxInfo = await getEvmThorTxInfo({
          sellAsset,
          buyAsset,
          sellAmountCryptoBaseUnit,
          slippageTolerance,
          destinationAddress: receiveAddress,
          protocolFees,
          affiliateBps,
          buyAssetUsdRate,
          feeAssetUsdRate,
          thornodeQuote,
        })

        if (maybeThorTxInfo.isErr()) return Err(maybeThorTxInfo.unwrapErr())
        const { data, router } = maybeThorTxInfo.unwrap()

        const maybeEvmTxFees = await getEvmTxFees({
          accountNumber,
          adapter: sellAdapter as unknown as EvmChainAdapter,
          data,
          supportsEIP1559: (input as GetEvmTradeQuoteInput).supportsEIP1559,
          router,
          value: isNativeEvmAsset(sellAsset.assetId) ? sellAmountCryptoBaseUnit : '0',
          wallet,
        })

        if (maybeEvmTxFees.isErr()) return Err(maybeEvmTxFees.unwrapErr())
        const { networkFeeCryptoBaseUnit } = maybeEvmTxFees.unwrap()

        return Ok({
          ...commonQuoteFields,
          rate,
          data,
          router,
          steps: [
            {
              ...commonStepFields,
              allowanceContract: router,
              feeData: {
                networkFeeCryptoBaseUnit,
                protocolFees,
              },
            },
          ],
        })
      })()

    case CHAIN_NAMESPACE.Utxo:
      return (async (): Promise<Result<TradeQuote<ThorUtxoSupportedChainId>, SwapErrorRight>> => {
        const maybeThorTxInfo = await getUtxoThorTxInfo({
          sellAsset,
          buyAsset,
          sellAmountCryptoBaseUnit,
          slippageTolerance,
          destinationAddress: receiveAddress,
          xpub: (input as GetUtxoTradeQuoteInput).xpub,
          protocolFees,
          affiliateBps,
          buyAssetUsdRate,
          feeAssetUsdRate,
          thornodeQuote,
        })

        if (maybeThorTxInfo.isErr()) return Err(maybeThorTxInfo.unwrapErr())
        const thorTxInfo = maybeThorTxInfo.unwrap()
        const { vault, opReturnData, pubkey } = thorTxInfo

        const feeData = await getUtxoTxFees({
          sellAmountCryptoBaseUnit,
          vault,
          opReturnData,
          pubkey,
          sellAdapter: sellAdapter as unknown as UtxoBaseAdapter<ThorUtxoSupportedChainId>,
          protocolFees,
        })

        return Ok({
          ...commonQuoteFields,
          rate,
          steps: [
            {
              ...commonStepFields,
              allowanceContract: '0x0', // not applicable to UTXOs
              feeData,
            },
          ],
        })
      })()
    case CHAIN_NAMESPACE.CosmosSdk:
      return (async (): Promise<
        Result<TradeQuote<ThorCosmosSdkSupportedChainId>, SwapErrorRight>
      > => {
        const getFeeDataInput: Partial<GetFeeDataInput<CosmosSdkChainId>> = {}

        const feeData = await (
          sellAdapter as unknown as CosmosSdkBaseAdapter<ThorCosmosSdkSupportedChainId>
        ).getFeeData(getFeeDataInput)

        return Ok({
          ...commonQuoteFields,
          rate,
          steps: [
            {
              ...commonStepFields,
              allowanceContract: '0x0', // not applicable to cosmos
              feeData: {
                networkFeeCryptoBaseUnit: feeData.fast.txFee,
                protocolFees,
                chainSpecific: { estimatedGasCryptoBaseUnit: feeData.fast.chainSpecific.gasLimit },
              },
            },
          ],
        })
      })()
    default:
      return Err(
        makeSwapErrorRight({
          message: '[getThorTradeQuote] - Asset chainId is not supported.',
          code: SwapErrorType.UNSUPPORTED_CHAIN,
          details: { chainId },
        }),
      )
  }
}
