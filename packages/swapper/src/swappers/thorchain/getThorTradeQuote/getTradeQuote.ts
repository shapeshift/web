import { ChainId, fromAssetId, getFeeAssetIdFromAssetId, toChainId } from '@shapeshiftoss/caip'

import { GetTradeQuoteInput, SwapError, SwapErrorTypes, TradeQuote } from '../../../api'
import { bnOrZero, fromBaseUnit } from '../../utils/bignumber'
import { DEFAULT_SLIPPAGE } from '../../utils/constants'
import { normalizeAmount } from '../../utils/helpers/helpers'
import { ThorchainSwapperDeps } from '../types'
import { MAX_THORCHAIN_TRADE } from '../utils/constants'
import { getThorTxInfo } from '../utils/ethereum/utils/getThorTxData'
import { getPriceRatio } from '../utils/getPriceRatio/getPriceRatio'
import { getEthTxFees } from '../utils/txFeeHelpers/ethTxFees/getEthTxFees'

export const getThorTradeQuote = async ({
  deps,
  input
}: {
  deps: ThorchainSwapperDeps
  input: GetTradeQuoteInput
}): Promise<TradeQuote<ChainId>> => {
  const { sellAsset, buyAsset, sellAmount, sellAssetAccountNumber, wallet } = input

  if (!wallet)
    throw new SwapError('[getTradeQuote] - wallet is required', {
      code: SwapErrorTypes.VALIDATION_FAILED
    })

  try {
    const {
      assetReference: sellAssetErc20Address,
      chainReference,
      chainNamespace
    } = fromAssetId(sellAsset.assetId)

    const isErc20Trade = sellAssetErc20Address.startsWith('0x')
    const sellAssetChainId = toChainId({ chainReference, chainNamespace })
    const adapter = deps.adapterManager.get(sellAssetChainId)
    if (!adapter)
      throw new SwapError(`[getThorTxInfo] - No chain adapter found for ${sellAssetChainId}.`, {
        code: SwapErrorTypes.UNSUPPORTED_CHAIN,
        details: { sellAssetChainId }
      })

    const bip44Params = adapter.buildBIP44Params({ accountNumber: Number(sellAssetAccountNumber) })
    const receiveAddress = await adapter.getAddress({ wallet, bip44Params })

    const { data, router } = await getThorTxInfo({
      deps,
      sellAsset,
      buyAsset,
      sellAmount,
      slippageTolerance: DEFAULT_SLIPPAGE,
      destinationAddress: receiveAddress,
      isErc20Trade
    })

    const feeData = await (async () => {
      switch (sellAssetChainId) {
        case 'eip155:1':
          return await getEthTxFees({
            deps,
            data,
            router,
            buyAsset,
            sellAmount,
            adapterManager: deps.adapterManager,
            receiveAddress,
            sellAssetReference: sellAssetErc20Address
          })
        default:
          throw new SwapError('[getThorTxInfo] - Asset chainId is not supported.', {
            code: SwapErrorTypes.UNSUPPORTED_CHAIN,
            details: { sellAssetChainId }
          })
      }
    })()

    const sellAssetId = sellAsset.assetId
    const buyAssetId = buyAsset.assetId
    const feeAssetId = getFeeAssetIdFromAssetId(buyAssetId)
    if (!feeAssetId)
      throw new SwapError(`[getThorTxInfo] - No feeAssetId found for ${buyAssetId}.`, {
        code: SwapErrorTypes.VALIDATION_FAILED,
        details: { buyAssetId }
      })

    const feeAssetRatio = await getPriceRatio(deps, { sellAssetId, buyAssetId: feeAssetId })
    const priceRatio = await getPriceRatio(deps, { sellAssetId, buyAssetId })
    const rate = bnOrZero(1).div(priceRatio).toString()
    const buyAmount = normalizeAmount(bnOrZero(sellAmount).times(rate))
    const sellAssetTradeFee = bnOrZero(feeData.tradeFee).times(bnOrZero(feeAssetRatio))

    // padding minimum by 1.5 the trade fee to avoid thorchain "not enough to cover fee" errors.
    const minimum = fromBaseUnit(sellAssetTradeFee.times(1.5).toString(), sellAsset.precision)

    return {
      rate,
      minimum,
      maximum: MAX_THORCHAIN_TRADE,
      feeData,
      sellAmount,
      buyAmount,
      sources: [{ name: 'thorchain', proportion: '1' }],
      allowanceContract: router,
      buyAsset,
      sellAsset,
      sellAssetAccountNumber
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[getThorTradeQuote]', {
      cause: e,
      code: SwapErrorTypes.TRADE_QUOTE_FAILED
    })
  }
}
