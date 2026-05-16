import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import type { EvmChainId } from '@shapeshiftoss/types'
import { bnOrZero, contractAddressOrUndefined } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  GetEvmTradeRateInput,
  GetTradeRateInput,
  GetUtxoTradeRateInput,
  SwapErrorRight,
  SwapperDeps,
  TradeRate,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { getInputOutputRate, makeSwapErrorRight } from '../../../utils'
import { buildAffiliateFee } from '../../utils/affiliateFee'
import { GARDEN_DEAD_ADDRESS_BY_NAMESPACE } from '../constants'
import { fetchGardenQuote, getGardenAssetInfo } from '../utils/fetchFromGarden'
import { assetIdToGardenAssetId, isSupportedGardenPair } from '../utils/helpers/helpers'

export const getTradeRate = async (
  input: GetTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
    sendAddress,
    slippageTolerancePercentageDecimal,
    affiliateBps,
  } = input

  if (!isSupportedGardenPair(sellAsset.assetId, buyAsset.assetId)) {
    return Err(
      makeSwapErrorRight({
        message: `Garden does not support ${sellAsset.symbol} → ${buyAsset.symbol}`,
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  const apiKey = deps.config.VITE_GARDEN_API_KEY
  if (!apiKey) {
    return Err(
      makeSwapErrorRight({
        message: 'VITE_GARDEN_API_KEY is not configured',
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  const fromGardenAsset = assetIdToGardenAssetId(sellAsset.assetId)
  const toGardenAsset = assetIdToGardenAssetId(buyAsset.assetId)
  if (!fromGardenAsset || !toGardenAsset) {
    return Err(
      makeSwapErrorRight({
        message: 'Asset not supported by Garden',
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  const sourceAssetInfoResult = await getGardenAssetInfo({ apiKey, gardenAssetId: fromGardenAsset })
  if (sourceAssetInfoResult.isErr()) return Err(sourceAssetInfoResult.unwrapErr())
  const sourceAssetInfo = sourceAssetInfoResult.unwrap()

  if (sourceAssetInfo) {
    if (bnOrZero(sellAmount).lt(sourceAssetInfo.min_amount)) {
      return Err(
        makeSwapErrorRight({
          message: 'Sell amount below Garden minimum',
          code: TradeQuoteError.SellAmountBelowMinimum,
          details: {
            minAmountCryptoBaseUnit: sourceAssetInfo.min_amount,
            assetId: sellAsset.assetId,
          },
        }),
      )
    }
    if (bnOrZero(sellAmount).gt(sourceAssetInfo.max_amount)) {
      return Err(
        makeSwapErrorRight({
          message: 'Sell amount above Garden maximum',
          code: TradeQuoteError.NoRouteFound,
          details: { maxAmountCryptoBaseUnit: sourceAssetInfo.max_amount },
        }),
      )
    }
  }

  const quoteResult = await fetchGardenQuote({
    apiKey,
    from: fromGardenAsset,
    to: toGardenAsset,
    fromAmount: sellAmount,
    affiliateBps,
  })

  if (quoteResult.isErr()) return Err(quoteResult.unwrapErr())
  const quote = quoteResult.unwrap()

  const { chainNamespace } = fromAssetId(sellAsset.assetId)
  const placeholderTo = GARDEN_DEAD_ADDRESS_BY_NAMESPACE[chainNamespace]

  const networkFeeCryptoBaseUnit: string | undefined = await (async () => {
    try {
      if (chainNamespace === CHAIN_NAMESPACE.Utxo) {
        const adapter = deps.assertGetUtxoChainAdapter(sellAsset.chainId)
        const pubkey = (input as GetUtxoTradeRateInput).xpub
        if (!pubkey || !placeholderTo) return undefined
        const utxoFee = await adapter.getFeeData({
          to: placeholderTo,
          value: sellAmount,
          chainSpecific: { pubkey },
          sendMax: false,
        })
        return utxoFee.fast.txFee
      }

      if (chainNamespace === CHAIN_NAMESPACE.Starknet) {
        if (!sendAddress || !placeholderTo) return undefined
        const adapter = deps.assertGetStarknetChainAdapter(sellAsset.chainId)
        const tokenContractAddress = contractAddressOrUndefined(sellAsset.assetId)
        const starknetFee = await adapter.getFeeData({
          to: placeholderTo,
          value: sellAmount,
          chainSpecific: { from: sendAddress, tokenContractAddress },
          sendMax: false,
        })
        return starknetFee.fast.txFee
      }

      if (chainNamespace === CHAIN_NAMESPACE.Evm) {
        if (!sendAddress || !placeholderTo) return undefined
        const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId as EvmChainId)
        const contractAddress = contractAddressOrUndefined(sellAsset.assetId)
        const data = evm.getErc20Data(placeholderTo, sellAmount, contractAddress)
        const feeData = await evm.getFees({
          adapter,
          data: data || '0x',
          to: contractAddress ?? placeholderTo,
          value: contractAddress ? '0' : sellAmount,
          from: sendAddress,
          supportsEIP1559: (input as GetEvmTradeRateInput).supportsEIP1559,
        })
        return feeData.networkFeeCryptoBaseUnit
      }

      return undefined
    } catch {
      return undefined
    }
  })()

  const rate = getInputOutputRate({
    sellAmountCryptoBaseUnit: quote.source.amount,
    buyAmountCryptoBaseUnit: quote.destination.amount,
    sellAsset,
    buyAsset,
  })

  const tradeRate: TradeRate = {
    id: uuid(),
    receiveAddress: undefined,
    affiliateBps,
    rate,
    slippageTolerancePercentageDecimal:
      slippageTolerancePercentageDecimal ??
      getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Garden),
    quoteOrRate: 'rate' as const,
    swapperName: SwapperName.Garden,
    steps: [
      {
        accountNumber: undefined,
        allowanceContract: '0x0',
        buyAmountBeforeFeesCryptoBaseUnit: quote.destination.amount,
        buyAmountAfterFeesCryptoBaseUnit: quote.destination.amount,
        buyAsset,
        feeData: {
          protocolFees: {},
          networkFeeCryptoBaseUnit,
        },
        rate,
        sellAmountIncludingProtocolFeesCryptoBaseUnit: quote.source.amount,
        sellAsset,
        source: SwapperName.Garden,
        estimatedExecutionTimeMs: quote.estimated_time * 1000,
        affiliateFee: buildAffiliateFee({
          strategy: 'buy_asset',
          affiliateBps,
          sellAsset,
          buyAsset,
          sellAmountCryptoBaseUnit: quote.source.amount,
          buyAmountCryptoBaseUnit: quote.destination.amount,
        }),
      },
    ],
  }

  return Ok([tradeRate])
}
