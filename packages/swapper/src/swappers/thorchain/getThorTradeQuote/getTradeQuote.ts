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
    receiveAddress,
  } = input

  if (!wallet)
    throw new SwapError('[getThorTradeQuote] - wallet is required', {
      code: SwapErrorTypes.VALIDATION_FAILED,
    })

  try {
    const { assetReference: sellAssetErc20Address } = fromAssetId(sellAsset.assetId)

    const sellAdapter = deps.adapterManager.get(chainId)
    if (!sellAdapter)
      throw new SwapError(`[getThorTradeQuote] - No chain adapter found for ${chainId}.`, {
        code: SwapErrorTypes.UNSUPPORTED_CHAIN,
        details: { chainId },
      })

    const rate = await getTradeRate(sellAsset, buyAsset.assetId, sellAmount, deps)

    const buyAmount = toBaseUnit(
      bnOrZero(fromBaseUnit(sellAmount, sellAsset.precision)).times(rate),
      buyAsset.precision,
    )

    const tradeFee = await estimateTradeFee(deps, buyAsset)

    const sellAssetTradeFee = bnOrZero(tradeFee).dividedBy(bnOrZero(rate))

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
      minimum,
    }

    const { chainNamespace } = fromAssetId(sellAsset.assetId)
    switch (chainNamespace) {
      case CHAIN_NAMESPACE.Ethereum:
        return (async (): Promise<TradeQuote<KnownChainIds.EthereumMainnet>> => {
          const { router } = await getEthThorTxInfo({
            deps,
            sellAsset,
            buyAsset,
            sellAmount,
            slippageTolerance: DEFAULT_SLIPPAGE,
            destinationAddress: receiveAddress,
            tradeFee,
          })
          const feeData = await getEthTxFees({
            adapterManager: deps.adapterManager,
            sellAssetReference: sellAssetErc20Address,
            tradeFee,
          })

          return {
            ...commonQuoteFields,
            allowanceContract: router,
            feeData,
          }
        })()

      case CHAIN_NAMESPACE.Bitcoin:
        return (async (): Promise<TradeQuote<UtxoSupportedChainIds>> => {
          const { vault, opReturnData, pubkey } = await getBtcThorTxInfo({
            deps,
            sellAsset,
            buyAsset,
            sellAmount,
            slippageTolerance: DEFAULT_SLIPPAGE,
            destinationAddress: receiveAddress,
            wallet,
            bip44Params: (input as GetUtxoTradeQuoteInput).bip44Params,
            accountType: (input as GetUtxoTradeQuoteInput).accountType,
            tradeFee,
          })

          const feeData = await getBtcTxFees({
            sellAmount,
            vault,
            opReturnData,
            pubkey,
            sellAdapter: sellAdapter as unknown as UtxoBaseAdapter<UtxoSupportedChainIds>,
            tradeFee,
          })

          return {
            ...commonQuoteFields,
            allowanceContract: '0x0', // not applicable to bitcoin
            feeData,
          }
        })()
      case CHAIN_NAMESPACE.Cosmos:
        return (async (): Promise<TradeQuote<KnownChainIds.CosmosMainnet>> => {
          const feeData = await (
            sellAdapter as ChainAdapter<KnownChainIds.CosmosMainnet>
          ).getFeeData({})

          return {
            ...commonQuoteFields,
            allowanceContract: '0x0', // not applicable to bitcoin
            feeData: {
              fee: feeData.fast.txFee,
              tradeFee,
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
