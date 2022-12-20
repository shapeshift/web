import { CHAIN_NAMESPACE, ChainId, fromAssetId } from '@shapeshiftoss/caip'
import { ChainAdapter, UtxoBaseAdapter } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import {
  EvmSupportedChainAdapter,
  EvmSupportedChainIds,
  GetTradeQuoteInput,
  GetUtxoTradeQuoteInput,
  SwapError,
  SwapErrorTypes,
  SwapperName,
  TradeQuote,
  UtxoSupportedChainIds,
} from '../../../api'
import { bn, bnOrZero, fromBaseUnit, toBaseUnit } from '../../utils/bignumber'
import { DEFAULT_SLIPPAGE } from '../../utils/constants'
import { RUNE_OUTBOUND_TRANSACTION_FEE_CRYPTO_HUMAN } from '../constants'
import { ThorchainSwapperDeps } from '../types'
import { getThorTxInfo as getBtcThorTxInfo } from '../utils/bitcoin/utils/getThorTxData'
import {
  MAX_THORCHAIN_TRADE,
  THOR_MINIMUM_PADDING,
  THORCHAIN_FIXED_PRECISION,
} from '../utils/constants'
import { getInboundAddressDataForChain } from '../utils/getInboundAddressDataForChain'
import { getTradeRate } from '../utils/getTradeRate/getTradeRate'
import { getUsdRate } from '../utils/getUsdRate/getUsdRate'
import { isRune } from '../utils/isRune/isRune'
import { getEvmTxFees } from '../utils/txFeeHelpers/evmTxFees/getEvmTxFees'
import { getUtxoTxFees } from '../utils/txFeeHelpers/utxoTxFees/getUtxoTxFees'
import { getSlippage } from './getSlippage'

type CommonQuoteFields = Omit<TradeQuote<ChainId>, 'allowanceContract' | 'feeData'>

type GetThorTradeQuoteInput = {
  deps: ThorchainSwapperDeps
  input: GetTradeQuoteInput
}

type GetThorTradeQuoteReturn = Promise<TradeQuote<ChainId>>

type GetThorTradeQuote = (args: GetThorTradeQuoteInput) => GetThorTradeQuoteReturn

export const getThorTradeQuote: GetThorTradeQuote = async ({ deps, input }) => {
  const {
    sellAsset,
    buyAsset,
    sellAmountBeforeFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
    bip44Params,
    chainId,
    receiveAddress,
    sendMax,
  } = input

  if (!bip44Params) {
    throw new Error('bip44Params required in getThorTradeQuote')
  }

  try {
    const { assetReference: sellAssetReference } = fromAssetId(sellAsset.assetId)
    const { chainId: buyAssetChainId } = fromAssetId(buyAsset.assetId)

    const sellAdapter = deps.adapterManager.get(chainId)
    const buyAdapter = deps.adapterManager.get(buyAssetChainId)
    if (!sellAdapter || !buyAdapter)
      throw new SwapError(
        `[getThorTradeQuote] - No chain adapter found for ${chainId} or ${buyAssetChainId}.`,
        {
          code: SwapErrorTypes.UNSUPPORTED_CHAIN,
          details: { sellAssetChainId: chainId, buyAssetChainId },
        },
      )

    const rate = await getTradeRate(sellAsset, buyAsset.assetId, sellAmountCryptoBaseUnit, deps)

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
      maximum: MAX_THORCHAIN_TRADE,
      sellAmountBeforeFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
      buyAmountCryptoBaseUnit,
      sources: [{ name: SwapperName.Thorchain, proportion: '1' }],
      buyAsset,
      sellAsset,
      bip44Params,
      minimumCryptoHuman: minimumSellAssetAmountPaddedCryptoHuman,
      recommendedSlippage: recommendedSlippage.toPrecision(),
    }

    const { chainNamespace } = fromAssetId(sellAsset.assetId)
    switch (chainNamespace) {
      case CHAIN_NAMESPACE.Evm:
        return (async (): Promise<TradeQuote<EvmSupportedChainIds>> => {
          const sellChainFeeAssetId = sellAdapter.getFeeAssetId()
          const evmAddressData = await getInboundAddressDataForChain(
            deps.daemonUrl,
            sellChainFeeAssetId,
          )
          const router = evmAddressData?.router
          if (!router)
            throw new SwapError(
              `[getThorTradeQuote] No router address found for ${sellChainFeeAssetId}`,
            )

          const feeData = await getEvmTxFees({
            adapter: sellAdapter as unknown as EvmSupportedChainAdapter,
            sellAssetReference,
            buyAssetTradeFeeUsd,
          })

          return {
            ...commonQuoteFields,
            allowanceContract: router,
            feeData,
          }
        })()

      case CHAIN_NAMESPACE.Utxo:
        return (async (): Promise<TradeQuote<UtxoSupportedChainIds>> => {
          const { vault, opReturnData, pubkey } = await getBtcThorTxInfo({
            deps,
            sellAsset,
            buyAsset,
            sellAmountCryptoBaseUnit,
            slippageTolerance: DEFAULT_SLIPPAGE,
            destinationAddress: receiveAddress,
            xpub: (input as GetUtxoTradeQuoteInput).xpub,
            buyAssetTradeFeeUsd,
          })

          const feeData = await getUtxoTxFees({
            sellAmountCryptoBaseUnit,
            vault,
            opReturnData,
            pubkey,
            sellAdapter: sellAdapter as unknown as UtxoBaseAdapter<UtxoSupportedChainIds>,
            buyAssetTradeFeeUsd,
            sendMax,
          })

          return {
            ...commonQuoteFields,
            allowanceContract: '0x0', // not applicable to bitcoin
            feeData,
          }
        })()
      case CHAIN_NAMESPACE.CosmosSdk:
        return (async (): Promise<TradeQuote<KnownChainIds.CosmosMainnet>> => {
          const feeData = await (
            sellAdapter as ChainAdapter<KnownChainIds.CosmosMainnet>
          ).getFeeData({})

          return {
            ...commonQuoteFields,
            allowanceContract: '0x0', // not applicable to cosmos
            feeData: {
              networkFeeCryptoBaseUnit: feeData.fast.txFee,
              buyAssetTradeFeeUsd,
              sellAssetTradeFeeUsd: '0',
              chainSpecific: { estimatedGas: feeData.fast.chainSpecific.gasLimit },
            },
          }
        })()
      default:
        throw new SwapError('[getThorTradeQuote] - Asset chainId is not supported.', {
          code: SwapErrorTypes.UNSUPPORTED_CHAIN,
          details: { chainId },
        })
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[getThorTradeQuote]', {
      cause: e,
      code: SwapErrorTypes.TRADE_QUOTE_FAILED,
    })
  }
}
