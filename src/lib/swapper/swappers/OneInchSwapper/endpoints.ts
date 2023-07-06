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
import { MINIMUM_DONATION_RECEIVE_AMOUNT_USD_FROM_ETH_CHAIN } from 'lib/swapper/swappers/utils/constants'
import { assertGetEvmChainAdapter, checkEvmSwapStatus } from 'lib/utils/evm'

import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { fetchOneInchSwap } from './utils/fetchOneInchSwap'

const tradeQuoteMetadata: Map<string, { chainId: EvmChainId }> = new Map()

export const oneInchApi: Swapper2Api = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
    { sellAssetUsdRate, buyAssetUsdRate }: { sellAssetUsdRate: string; buyAssetUsdRate: string },
  ): Promise<Result<TradeQuote2, SwapErrorRight>> => {
    const tradeQuoteResult = await getTradeQuote(input as GetEvmTradeQuoteInput, sellAssetUsdRate)
    const { receiveAddress, affiliateBps } = input

    return tradeQuoteResult.map(tradeQuote => {
      const id = uuid()
      const firstHop = tradeQuote.steps[0]
      const buyAmountBeforeFeesCryptoPrecision = fromBaseUnit(
        firstHop.buyAmountBeforeFeesCryptoBaseUnit,
        firstHop.buyAsset.precision,
      )
      const buyAmountUsd = bnOrZero(buyAmountBeforeFeesCryptoPrecision).times(buyAssetUsdRate)
      const isDonationAmountBelowMinimum = buyAmountUsd.lt(
        MINIMUM_DONATION_RECEIVE_AMOUNT_USD_FROM_ETH_CHAIN,
      )
      tradeQuoteMetadata.set(id, { chainId: tradeQuote.steps[0].sellAsset.chainId as EvmChainId })
      return {
        id,
        receiveAddress,
        affiliateBps: isDonationAmountBelowMinimum ? undefined : affiliateBps,
        ...tradeQuote,
      }
    })
  },

  getUnsignedTx: async ({ from, tradeQuote, stepIndex }: GetUnsignedTxArgs): Promise<ETHSignTx> => {
    const { accountNumber, buyAsset, sellAsset, sellAmountBeforeFeesCryptoBaseUnit } =
      tradeQuote.steps[stepIndex]

    const { receiveAddress, recommendedSlippage, affiliateBps } = tradeQuote

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

    const {
      tx: { value, to, gasPrice, gas, data },
    } = await fetchOneInchSwap({
      affiliateBps,
      buyAsset,
      receiveAddress,
      sellAmountBeforeFeesCryptoBaseUnit,
      sellAsset,
      maximumSlippageDecimalPercentage: recommendedSlippage, // TODO: use the slippage from user input
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
