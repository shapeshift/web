import type { ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import type {
  CosmosSdkBaseAdapter,
  EvmBaseAdapter,
  UtxoBaseAdapter,
} from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type {
  GetTradeQuoteInput,
  GetUtxoTradeQuoteInput,
  SwapErrorMonad,
  TradeQuote,
} from '../../../api'
import { makeSwapErrorMonad, SwapError, SwapErrorType, SwapperName } from '../../../api'
import { bn, bnOrZero, fromBaseUnit, toBaseUnit } from '../../utils/bignumber'
import { DEFAULT_SLIPPAGE } from '../../utils/constants'
import { RUNE_OUTBOUND_TRANSACTION_FEE_CRYPTO_HUMAN } from '../constants'
import type {
  ThorCosmosSdkSupportedChainId,
  ThorEvmSupportedChainId,
  ThorUtxoSupportedChainId,
} from '../ThorchainSwapper'
import type { ThorchainSwapperDeps } from '../types'
import {
  MAX_THORCHAIN_TRADE,
  THOR_MINIMUM_PADDING,
  THORCHAIN_FIXED_PRECISION,
} from '../utils/constants'
import { getInboundAddressDataForChain } from '../utils/getInboundAddressDataForChain'
import { getTradeRate, getTradeRateBelowMinimum } from '../utils/getTradeRate/getTradeRate'
import { getUsdRate } from '../utils/getUsdRate/getUsdRate'
import { isRune } from '../utils/isRune/isRune'
import { getEvmTxFees } from '../utils/txFeeHelpers/evmTxFees/getEvmTxFees'
import { getUtxoTxFees } from '../utils/txFeeHelpers/utxoTxFees/getUtxoTxFees'
import { getThorTxInfo } from '../utxo/utils/getThorTxData'
import { getSlippage } from './getSlippage'

type CommonQuoteFields = Omit<TradeQuote<ChainId>, 'allowanceContract' | 'feeData'>

type GetThorTradeQuoteInput = {
  deps: ThorchainSwapperDeps
  input: GetTradeQuoteInput
}

type GetThorTradeQuoteReturn = Promise<Result<TradeQuote<ChainId>, SwapErrorMonad>>

type GetThorTradeQuote = (args: GetThorTradeQuoteInput) => GetThorTradeQuoteReturn

export const getThorTradeQuote: GetThorTradeQuote = async ({ deps, input }) => {
  const {
    sellAsset,
    buyAsset,
    sellAmountBeforeFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
    accountNumber,
    chainId,
    receiveAddress,
    sendMax,
  } = input

  try {
    const { assetReference: sellAssetReference } = fromAssetId(sellAsset.assetId)
    const { chainId: buyAssetChainId } = fromAssetId(buyAsset.assetId)

    const sellAdapter = deps.adapterManager.get(chainId)
    const buyAdapter = deps.adapterManager.get(buyAssetChainId)
    if (!sellAdapter || !buyAdapter)
      return Err(
        makeSwapErrorMonad({
          message: `[getThorTradeQuote] - No chain adapter found for ${chainId} or ${buyAssetChainId}.`,
          code: SwapErrorType.UNSUPPORTED_CHAIN,
          details: { sellAssetChainId: chainId, buyAssetChainId },
        }),
      )

    const quoteRate = await getTradeRate({
      sellAsset,
      buyAssetId: buyAsset.assetId,
      sellAmountCryptoBaseUnit,
      receiveAddress,
      deps,
    })

    const rate = await quoteRate.match({
      ok: rate => Promise.resolve(rate),
      // TODO: Handle TRADE_BELOW_MINIMUM specifically and return a result here as well
      // Though realistically, TRADE_BELOW_MINIMUM is the only one we should really be seeing here,
      // safety never hurts
      err: _err =>
        getTradeRateBelowMinimum({
          sellAssetId: sellAsset.assetId,
          buyAssetId: buyAsset.assetId,
          deps,
        }),
    })

    const buyAmountCryptoBaseUnit = toBaseUnit(
      bnOrZero(fromBaseUnit(sellAmountCryptoBaseUnit, sellAsset.precision)).times(rate),
      buyAsset.precision,
    )

    const buyAssetAddressData = await getInboundAddressDataForChain(
      deps.daemonUrl,
      buyAsset.assetId,
    )

    const sellAmountThorPrecision = toBaseUnit(
      fromBaseUnit(sellAmountCryptoBaseUnit, sellAsset.precision),
      THORCHAIN_FIXED_PRECISION,
    )

    const recommendedSlippage = await getSlippage({
      inputAmountThorPrecision: bn(sellAmountThorPrecision),
      daemonUrl: deps.daemonUrl,
      buyAssetId: buyAsset.assetId,
      sellAssetId: sellAsset.assetId,
    })

    const estimatedBuyAssetTradeFeeFeeAssetCryptoHuman = isRune(buyAsset.assetId)
      ? RUNE_OUTBOUND_TRANSACTION_FEE_CRYPTO_HUMAN.toString()
      : fromBaseUnit(bnOrZero(buyAssetAddressData?.outbound_fee), THORCHAIN_FIXED_PRECISION)

    const buyAssetChainFeeAssetId = buyAdapter.getFeeAssetId()

    const sellAssetUsdRate = await getUsdRate(deps.daemonUrl, sellAsset.assetId)
    const buyFeeAssetUsdRate = await getUsdRate(deps.daemonUrl, buyAssetChainFeeAssetId)

    const buyAssetTradeFeeUsd = bn(buyFeeAssetUsdRate)
      .times(estimatedBuyAssetTradeFeeFeeAssetCryptoHuman)
      .toString()

    const minimumSellAssetAmountCryptoHuman = bn(sellAssetUsdRate).isGreaterThan(0)
      ? bnOrZero(buyAssetTradeFeeUsd).div(sellAssetUsdRate)
      : 0 // We don't have a valid rate for the sell asset, there is no sane minimum

    // minimum is tradeFee padded by an amount to be sure they get something back
    // usually it will be slightly more than the amount because sellAssetTradeFee is already a high estimate
    const minimumSellAssetAmountPaddedCryptoHuman = bnOrZero(minimumSellAssetAmountCryptoHuman)
      .times(THOR_MINIMUM_PADDING)
      .toString()

    const commonQuoteFields: CommonQuoteFields = {
      rate,
      maximumCryptoHuman: MAX_THORCHAIN_TRADE,
      sellAmountBeforeFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
      buyAmountCryptoBaseUnit,
      sources: [{ name: SwapperName.Thorchain, proportion: '1' }],
      buyAsset,
      sellAsset,
      accountNumber,
      minimumCryptoHuman: minimumSellAssetAmountPaddedCryptoHuman,
      recommendedSlippage: recommendedSlippage.toPrecision(),
    }

    const { chainNamespace } = fromAssetId(sellAsset.assetId)
    switch (chainNamespace) {
      case CHAIN_NAMESPACE.Evm:
        return (async (): Promise<
          Promise<Result<TradeQuote<ThorEvmSupportedChainId>, SwapErrorMonad>>
        > => {
          const sellChainFeeAssetId = sellAdapter.getFeeAssetId()
          const evmAddressData = await getInboundAddressDataForChain(
            deps.daemonUrl,
            sellChainFeeAssetId,
            false,
          )
          const router = evmAddressData?.router
          if (!router)
            return Err(
              makeSwapErrorMonad({
                message: `[getThorTradeQuote] No router address found for ${sellChainFeeAssetId}`,
              }),
            )

          const feeData = await getEvmTxFees({
            adapter: sellAdapter as unknown as EvmBaseAdapter<ThorEvmSupportedChainId>,
            sellAssetReference,
            buyAssetTradeFeeUsd,
          })

          return Ok({
            ...commonQuoteFields,
            allowanceContract: router,
            feeData,
          })
        })()

      case CHAIN_NAMESPACE.Utxo:
        return (async (): Promise<Result<TradeQuote<ThorUtxoSupportedChainId>, SwapErrorMonad>> => {
          const maybeThorTxInfo = await getThorTxInfo({
            deps,
            sellAsset,
            buyAsset,
            sellAmountCryptoBaseUnit,
            slippageTolerance: DEFAULT_SLIPPAGE,
            destinationAddress: receiveAddress,
            xpub: (input as GetUtxoTradeQuoteInput).xpub,
            buyAssetTradeFeeUsd,
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
            buyAssetTradeFeeUsd,
            sendMax,
          })

          return Ok({
            ...commonQuoteFields,
            allowanceContract: '0x0', // not applicable to bitcoin
            feeData,
          })
        })()
      case CHAIN_NAMESPACE.CosmosSdk:
        return (async (): Promise<
          Result<TradeQuote<ThorCosmosSdkSupportedChainId>, SwapErrorMonad>
        > => {
          const feeData = await (
            sellAdapter as unknown as CosmosSdkBaseAdapter<ThorCosmosSdkSupportedChainId>
          ).getFeeData({})

          return Ok({
            ...commonQuoteFields,
            allowanceContract: '0x0', // not applicable to cosmos
            feeData: {
              networkFeeCryptoBaseUnit: feeData.fast.txFee,
              buyAssetTradeFeeUsd,
              sellAssetTradeFeeUsd: '0',
              chainSpecific: { estimatedGasCryptoBaseUnit: feeData.fast.chainSpecific.gasLimit },
            },
          })
        })()
      default:
        return Err(
          makeSwapErrorMonad({
            message: '[getThorTradeQuote] - Asset chainId is not supported.',
            code: SwapErrorType.UNSUPPORTED_CHAIN,
            details: { chainId },
          }),
        )
    }
  } catch (e) {
    // TODO: We shouldn't nee to catch anymore, since there should never be errors in the first place 🎉
    if (e instanceof SwapError)
      return Err(
        makeSwapErrorMonad({
          message: e.message,
          code: e.code,
          details: e.details,
        }),
      )
    return Err(
      makeSwapErrorMonad({
        message: '[getThorTradeQuote]',
        cause: e,
        code: SwapErrorType.TRADE_QUOTE_FAILED,
      }),
    )
  }
}
