import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { ETHSignTx } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads/build'
import { v4 as uuid } from 'uuid'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import type {
  GetEvmTradeQuoteInput,
  GetTradeQuoteInput,
  GetUnsignedTxArgs,
  SwapErrorRight,
  Swapper2Api,
  TradeQuote2,
} from 'lib/swapper/api'
import { getMinimumDonationUsdSellAmountByChainId } from 'lib/swapper/swappers/utils/getMinimumDonationUsdSellAmountByChainId'
import { assertGetEvmChainAdapter, checkEvmSwapStatus } from 'lib/utils/evm'

import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { fetchOneInchSwap } from './utils/fetchOneInchSwap'

const tradeQuoteMetadata: Map<string, { chainId: EvmChainId }> = new Map()

export const oneInchApi: Swapper2Api = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
    { sellAssetUsdRate }: { sellAssetUsdRate: string },
  ): Promise<Result<TradeQuote2, SwapErrorRight>> => {
    const {
      sellAsset,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      affiliateBps,
      receiveAddress,
    } = input

    const sellAmountBeforeFeesCryptoPrecision = fromBaseUnit(
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      sellAsset.precision,
    )
    const sellAmountBeforeFeesUsd = bnOrZero(sellAmountBeforeFeesCryptoPrecision).times(
      sellAssetUsdRate,
    )
    // We use the sell amount so we don't have to make 2 network requests, as the receive amount requires a quote
    const isDonationAmountBelowMinimum = sellAmountBeforeFeesUsd.lt(
      getMinimumDonationUsdSellAmountByChainId(sellAsset.chainId),
    )

    const tradeQuoteResult = await getTradeQuote({
      ...(input as GetEvmTradeQuoteInput),
      affiliateBps: isDonationAmountBelowMinimum ? '0' : affiliateBps,
    })
    return tradeQuoteResult.map(tradeQuote => {
      const id = uuid()
      const firstHop = tradeQuote.steps[0]
      tradeQuoteMetadata.set(id, { chainId: firstHop.sellAsset.chainId as EvmChainId })
      return {
        id,
        receiveAddress,
        affiliateBps: isDonationAmountBelowMinimum ? undefined : affiliateBps,
        ...tradeQuote,
      }
    })
  },

  getUnsignedTx: async ({
    from,
    slippageTolerancePercentageDecimal,
    tradeQuote,
    stepIndex,
  }: GetUnsignedTxArgs): Promise<ETHSignTx> => {
    const { accountNumber, buyAsset, sellAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } =
      tradeQuote.steps[stepIndex]

    const { receiveAddress, affiliateBps } = tradeQuote

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

    const {
      tx: { value, to, gasPrice, gas, data },
    } = await fetchOneInchSwap({
      affiliateBps,
      buyAsset,
      receiveAddress,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      sellAsset,
      maximumSlippageDecimalPercentage: slippageTolerancePercentageDecimal,
    })

    const buildSendApiTxInput = {
      value,
      to,
      from: from!,
      chainSpecific: {
        gasPrice,
        gasLimit: gas,
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined,
        data,
      },
      accountNumber,
    }
    return adapter.buildSendApiTransaction(buildSendApiTxInput)
  },

  checkTradeStatus: checkEvmSwapStatus,
}
