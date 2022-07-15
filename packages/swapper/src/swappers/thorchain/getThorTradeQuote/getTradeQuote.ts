import { ChainId, fromAssetId, getFeeAssetIdFromAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'

import { GetTradeQuoteInput, SwapError, SwapErrorTypes, TradeQuote } from '../../../api'
import { bnOrZero, fromBaseUnit } from '../../utils/bignumber'
import { DEFAULT_SLIPPAGE } from '../../utils/constants'
import { normalizeAmount } from '../../utils/helpers/helpers'
import { ThorchainSwapperDeps } from '../types'
import { getThorTxInfo as getBtcThorTxInfo } from '../utils/bitcoin/utils/getThorTxData'
import { MAX_THORCHAIN_TRADE } from '../utils/constants'
import { estimateTradeFee } from '../utils/estimateTradeFee/estimateTradeFee'
import { getThorTxInfo as getEthThorTxInfo } from '../utils/ethereum/utils/getThorTxData'
import { getPriceRatio } from '../utils/getPriceRatio/getPriceRatio'
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
    sellAmount,
    sellAssetAccountNumber,
    wallet,
    chainId,
    receiveAddress
  } = input

  if (!wallet)
    throw new SwapError('[getTradeQuote] - wallet is required', {
      code: SwapErrorTypes.VALIDATION_FAILED
    })

  try {
    const { assetReference: sellAssetErc20Address } = fromAssetId(sellAsset.assetId)

    const adapter = deps.adapterManager.get(chainId)
    if (!adapter)
      throw new SwapError(`[getThorTradeQuote] - No chain adapter found for ${chainId}.`, {
        code: SwapErrorTypes.UNSUPPORTED_CHAIN,
        details: { chainId }
      })

    const sellAssetId = sellAsset.assetId
    const buyAssetId = buyAsset.assetId
    const feeAssetId = getFeeAssetIdFromAssetId(buyAssetId)
    if (!feeAssetId)
      throw new SwapError(`[getThorTradeQuote] - No feeAssetId found for ${buyAssetId}.`, {
        code: SwapErrorTypes.VALIDATION_FAILED,
        details: { buyAssetId }
      })

    const priceRatio = await getPriceRatio(deps, { sellAssetId, buyAssetId })
    const rate = bnOrZero(1).div(priceRatio).toString()
    const buyAmount = normalizeAmount(bnOrZero(sellAmount).times(rate))

    const tradeFee = await estimateTradeFee(deps, buyAsset.assetId)

    const sellAssetTradeFee = fromBaseUnit(
      bnOrZero(tradeFee).times(bnOrZero(priceRatio)),
      buyAsset.precision
    )

    // padding minimum by 1.5 the trade fee to avoid thorchain "not enough to cover fee" errors.
    const minimum = bnOrZero(sellAssetTradeFee).times(1.5).toString()
    const commonQuoteFields: CommonQuoteFields = {
      rate,
      maximum: MAX_THORCHAIN_TRADE,
      sellAmount,
      buyAmount,
      sources: [{ name: 'thorchain', proportion: '1' }],
      buyAsset,
      sellAsset,
      sellAssetAccountNumber,
      minimum
    }

    switch (chainId) {
      case KnownChainIds.EthereumMainnet:
        return (async (): Promise<TradeQuote<KnownChainIds.EthereumMainnet>> => {
          const { data, router } = await getEthThorTxInfo({
            deps,
            sellAsset,
            buyAsset,
            sellAmount,
            slippageTolerance: DEFAULT_SLIPPAGE,
            destinationAddress: receiveAddress
          })
          const feeData = await getEthTxFees({
            deps,
            data,
            router,
            buyAsset,
            sellAmount,
            adapterManager: deps.adapterManager,
            receiveAddress,
            sellAssetReference: sellAssetErc20Address
          })

          return {
            ...commonQuoteFields,
            allowanceContract: router,
            feeData
          }
        })()

      case KnownChainIds.BitcoinMainnet:
        return (async (): Promise<TradeQuote<KnownChainIds.BitcoinMainnet>> => {
          const { vault, opReturnData, pubkey } = await getBtcThorTxInfo({
            deps,
            sellAsset,
            buyAsset,
            sellAmount,
            slippageTolerance: DEFAULT_SLIPPAGE,
            destinationAddress: receiveAddress,
            wallet,
            bip44Params: input.bip44Params,
            accountType: input.accountType
          })

          const feeData = await getBtcTxFees({
            deps,
            buyAsset,
            sellAmount,
            vault,
            opReturnData,
            pubkey,
            adapterManager: deps.adapterManager
          })

          return {
            ...commonQuoteFields,
            allowanceContract: '0x0',
            feeData
          }
        })()
      default:
        throw new SwapError('[getThorTradeQuote] - Asset chainId is not supported.', {
          code: SwapErrorTypes.UNSUPPORTED_CHAIN,
          details: { chainId }
        })
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[getThorTradeQuote]', {
      cause: e,
      code: SwapErrorTypes.TRADE_QUOTE_FAILED
    })
  }
}
