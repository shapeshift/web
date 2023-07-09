import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { ETHSignTx } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
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
import { MINIMUM_DONATION_SELL_AMOUNT_USD_FROM_ETH_CHAIN } from 'lib/swapper/swappers/utils/constants'
import { assertGetEvmChainAdapter, checkEvmSwapStatus } from 'lib/utils/evm'

import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { fetchOneInchSwap } from './utils/fetchOneInchSwap'

const tradeQuoteMetadata: Map<string, { chainId: EvmChainId }> = new Map()

export const oneInchApi: Swapper2Api = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
    { sellAssetUsdRate }: { sellAssetUsdRate: string },
  ): Promise<Result<TradeQuote2, SwapErrorRight>> => {
    const { sellAsset, sellAmountBeforeFeesCryptoBaseUnit, affiliateBps, receiveAddress } = input

    const sellAmountBeforeFeesCryptoPrecision = fromBaseUnit(
      sellAmountBeforeFeesCryptoBaseUnit,
      sellAsset.precision,
    )
    const sellAmountBeforeFeesUsd = bnOrZero(sellAmountBeforeFeesCryptoPrecision).times(
      sellAssetUsdRate,
    )
    // We use the sell amount so we don't have to make 2 network requests, as the receive amount requires a quote
    const isDonationAmountBelowMinimum =
      sellAmountBeforeFeesUsd.lt(MINIMUM_DONATION_SELL_AMOUNT_USD_FROM_ETH_CHAIN) &&
      sellAsset.chainId === KnownChainIds.EthereumMainnet

    const tradeQuoteResult = await getTradeQuote(
      {
        ...(input as GetEvmTradeQuoteInput),
        affiliateBps: isDonationAmountBelowMinimum ? '0' : affiliateBps,
      },
      sellAssetUsdRate,
    )
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
