import { ChainId, fromAssetId, getFeeAssetIdFromAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'

import { GetTradeQuoteInput, SwapError, SwapErrorTypes, TradeQuote } from '../../../api'
import { bnOrZero, fromBaseUnit, toBaseUnit } from '../../utils/bignumber'
import { DEFAULT_SLIPPAGE } from '../../utils/constants'
import { ThorchainSwapperDeps } from '../types'
import { getThorTxInfo as getBtcThorTxInfo } from '../utils/bitcoin/utils/getThorTxData'
import { MAX_THORCHAIN_TRADE, THOR_MINIMUM_PADDING } from '../utils/constants'
import { estimateTradeFee } from '../utils/estimateTradeFee/estimateTradeFee'
import { getThorTxInfo as getEthThorTxInfo } from '../utils/ethereum/utils/getThorTxData'
import { getTradeRate } from '../utils/getTradeRate/getTradeRate'
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
    throw new SwapError('[getThorTradeQuote] - wallet is required', {
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

    const buyAssetId = buyAsset.assetId
    const feeAssetId = getFeeAssetIdFromAssetId(buyAssetId)
    if (!feeAssetId)
      throw new SwapError(`[getThorTradeQuote] - No feeAssetId found for ${buyAssetId}.`, {
        code: SwapErrorTypes.VALIDATION_FAILED,
        details: { buyAssetId }
      })

    const tradeRate = await getTradeRate(sellAsset, buyAsset.assetId, sellAmount, deps)
    const rate = bnOrZero(1).div(tradeRate).toString()

    const buyAmount = toBaseUnit(
      bnOrZero(fromBaseUnit(sellAmount, sellAsset.precision)).times(tradeRate),
      buyAsset.precision
    )

    const tradeFee = await estimateTradeFee(deps, buyAsset)

    const sellAssetTradeFee = bnOrZero(tradeFee).times(bnOrZero(rate))

    // minimum is tradeFee padded by an amount to be sure they get something back
    // usually it will be slightly more than the amount because sellAssetTradeFee is already a high estimate
    const minimum = bnOrZero(sellAssetTradeFee).times(THOR_MINIMUM_PADDING).toString()

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
          const { router } = await getEthThorTxInfo({
            deps,
            sellAsset,
            buyAsset,
            sellAmount,
            slippageTolerance: DEFAULT_SLIPPAGE,
            destinationAddress: receiveAddress,
            tradeFee
          })
          const feeData = await getEthTxFees({
            adapterManager: deps.adapterManager,
            sellAssetReference: sellAssetErc20Address,
            tradeFee
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
            accountType: input.accountType,
            tradeFee
          })

          const feeData = await getBtcTxFees({
            sellAmount,
            vault,
            opReturnData,
            pubkey,
            adapterManager: deps.adapterManager,
            tradeFee
          })

          return {
            ...commonQuoteFields,
            allowanceContract: '0x0', // not applicable to bitcoin
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
