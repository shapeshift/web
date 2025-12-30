import type { SwapperApi, TradeStatus } from '../../types'
import {
  checkStarknetSwapStatus,
  createDefaultStatusResponse,
  getExecutableTradeStep,
  isExecutableTradeQuote,
} from '../../utils'
import { getTradeQuote } from './swapperApi/getTradeQuote'
import { getTradeRate } from './swapperApi/getTradeRate'
import { getTokenAddress } from './utils/helpers'

export const avnuApi: SwapperApi = {
  getTradeQuote,
  getTradeRate: (input, deps) => {
    return getTradeRate(input, deps)
  },

  getUnsignedStarknetTransaction: async ({
    stepIndex,
    tradeQuote,
    from,
    assertGetStarknetChainAdapter,
  }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { accountNumber, sellAsset, avnuSpecific } = step
    if (!avnuSpecific) throw new Error('avnuSpecific is required')

    const adapter = assertGetStarknetChainAdapter(sellAsset.chainId)

    const value = step.sellAmountIncludingProtocolFeesCryptoBaseUnit
    const tokenContractAddress = getTokenAddress(sellAsset)

    const { fast } = await adapter.getFeeData()

    return adapter.buildSendApiTransaction({
      from,
      to: tokenContractAddress || '',
      value,
      accountNumber,
      chainSpecific: {
        tokenContractAddress,
        maxFee: fast.chainSpecific.maxFee,
      },
    })
  },

  getStarknetTransactionFees: ({ tradeQuote, stepIndex }) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)
    if (!step.feeData.networkFeeCryptoBaseUnit) {
      throw new Error('Missing network fee in quote')
    }
    return Promise.resolve(step.feeData.networkFeeCryptoBaseUnit)
  },

  checkTradeStatus: ({ swap, assertGetStarknetChainAdapter }): Promise<TradeStatus> => {
    if (!swap?.sellTxHash) {
      return Promise.resolve(createDefaultStatusResponse())
    }

    return checkStarknetSwapStatus({
      txHash: swap.sellTxHash,
      assertGetStarknetChainAdapter,
    })
  },
}
