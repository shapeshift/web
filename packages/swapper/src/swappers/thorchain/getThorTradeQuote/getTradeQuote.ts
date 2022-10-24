import { CHAIN_NAMESPACE, ChainId, fromAssetId } from '@shapeshiftoss/caip'
import { ChainAdapter, UtxoBaseAdapter } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import {
  GetTradeQuoteInput,
  GetUtxoTradeQuoteInput,
  SwapError,
  SwapErrorTypes,
  TradeQuote,
  UtxoSupportedChainIds,
} from '../../../api'
import { bn, bnOrZero, fromBaseUnit, toBaseUnit } from '../../utils/bignumber'
import { DEFAULT_SLIPPAGE } from '../../utils/constants'
import {
  MINIMUM_USD_TRADE_AMOUNT,
  MINIMUM_USD_TRADE_AMOUNT_ETHEREUM_NETWORK,
  RUNE_OUTBOUND_TRANSACTION_FEE_CRYPTO_HUMAN,
} from '../constants'
import { ThorchainSwapperDeps } from '../types'
import { getThorTxInfo as getBtcThorTxInfo } from '../utils/bitcoin/utils/getThorTxData'
import { MAX_THORCHAIN_TRADE, THOR_MINIMUM_PADDING } from '../utils/constants'
import { estimateBuyAssetTradeFeeCrypto } from '../utils/estimateBuyAssetTradeFeeCrypto/estimateBuyAssetTradeFeeCrypto'
import { getThorTxInfo as getEthThorTxInfo } from '../utils/ethereum/utils/getThorTxData'
import { getTradeRate } from '../utils/getTradeRate/getTradeRate'
import { getUsdRate } from '../utils/getUsdRate/getUsdRate'
import { isRune } from '../utils/isRune/isRune'
import { getBtcTxFees } from '../utils/txFeeHelpers/btcTxFees/getBtcTxFees'
import { getEthTxFees } from '../utils/txFeeHelpers/ethTxFees/getEthTxFees'

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
    sellAmountCryptoPrecision,
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

    const sellAdapter = deps.adapterManager.get(chainId)
    if (!sellAdapter)
      throw new SwapError(`[getThorTradeQuote] - No chain adapter found for ${chainId}.`, {
        code: SwapErrorTypes.UNSUPPORTED_CHAIN,
        details: { chainId },
      })

    const rate = await getTradeRate(sellAsset, buyAsset.assetId, sellAmountCryptoPrecision, deps)

    const buyAmountCryptoPrecision = toBaseUnit(
      bnOrZero(fromBaseUnit(sellAmountCryptoPrecision, sellAsset.precision)).times(rate),
      buyAsset.precision,
    )

    const estimatedBuyAssetTradeFeeCryptoHuman = await estimateBuyAssetTradeFeeCrypto(
      deps,
      buyAsset,
    )

    const buyAssetUsdRate = await getUsdRate({ deps, input: { assetId: buyAsset.assetId } })
    const sellAssetUsdRate = await getUsdRate({ deps, input: { assetId: sellAsset.assetId } })
    const estimatedBuyAssetTradeFeeUsd = bn(buyAssetUsdRate)
      .times(estimatedBuyAssetTradeFeeCryptoHuman)
      .toString()

    const minimumUsdAmount =
      buyAsset.chainId === KnownChainIds.EthereumMainnet
        ? MINIMUM_USD_TRADE_AMOUNT_ETHEREUM_NETWORK
        : MINIMUM_USD_TRADE_AMOUNT

    const buyAssetTradeFeeUsdOrMinimum = minimumUsdAmount.gt(estimatedBuyAssetTradeFeeUsd)
      ? minimumUsdAmount.toString()
      : estimatedBuyAssetTradeFeeUsd

    const minimumSellAssetAmountCryptoHuman = (() => {
      // The 1$ minimum doesn't apply for swaps to RUNE, use OutboundTransactionFee in human value instead
      if (isRune(buyAsset?.assetId)) return RUNE_OUTBOUND_TRANSACTION_FEE_CRYPTO_HUMAN

      return bnOrZero(buyAssetTradeFeeUsdOrMinimum).div(sellAssetUsdRate)
    })()
    // minimum is tradeFee padded by an amount to be sure they get something back
    // usually it will be slightly more than the amount because sellAssetTradeFee is already a high estimate
    const minimumSellAssetAmountPaddedCryptoHuman = bnOrZero(minimumSellAssetAmountCryptoHuman)
      .times(THOR_MINIMUM_PADDING)
      .toString()

    const buyAssetTradeFeeUsdOrDefault = isRune(buyAsset?.assetId)
      ? bn(buyAssetUsdRate).times(RUNE_OUTBOUND_TRANSACTION_FEE_CRYPTO_HUMAN).toString()
      : estimatedBuyAssetTradeFeeUsd

    const commonQuoteFields: CommonQuoteFields = {
      rate,
      maximum: MAX_THORCHAIN_TRADE,
      sellAmountCryptoPrecision,
      buyAmountCryptoPrecision,
      sources: [{ name: 'thorchain', proportion: '1' }],
      buyAsset,
      sellAsset,
      bip44Params,
      minimumCryptoHuman: minimumSellAssetAmountPaddedCryptoHuman,
    }

    const { chainNamespace } = fromAssetId(sellAsset.assetId)
    switch (chainNamespace) {
      case CHAIN_NAMESPACE.Evm:
        return (async (): Promise<TradeQuote<KnownChainIds.EthereumMainnet>> => {
          const { router } = await getEthThorTxInfo({
            deps,
            sellAsset,
            buyAsset,
            sellAmountCryptoPrecision,
            slippageTolerance: DEFAULT_SLIPPAGE,
            destinationAddress: receiveAddress,
            buyAssetTradeFeeUsd: estimatedBuyAssetTradeFeeUsd,
          })
          const feeData = await getEthTxFees({
            adapterManager: deps.adapterManager,
            sellAssetReference,
            buyAssetTradeFeeUsd: estimatedBuyAssetTradeFeeUsd,
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
            sellAmountCryptoPrecision,
            slippageTolerance: DEFAULT_SLIPPAGE,
            destinationAddress: receiveAddress,
            xpub: (input as GetUtxoTradeQuoteInput).xpub,
            buyAssetTradeFeeUsd: estimatedBuyAssetTradeFeeUsd,
          })

          const feeData = await getBtcTxFees({
            sellAmountCryptoPrecision,
            vault,
            opReturnData,
            pubkey,
            sellAdapter: sellAdapter as unknown as UtxoBaseAdapter<UtxoSupportedChainIds>,
            buyAssetTradeFeeUsd: estimatedBuyAssetTradeFeeUsd,
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
              networkFee: feeData.fast.txFee,
              buyAssetTradeFeeUsd: buyAssetTradeFeeUsdOrDefault,
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
