import { TxStatus } from '@shapeshiftoss/unchained-client'
import { bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../constants'
import type {
  CommonTradeQuoteInput,
  GetTradeRateInput,
  GetUnsignedAptosTransactionArgs,
  SwapErrorRight,
  SwapperApi,
  SwapperDeps,
  TradeQuote,
  TradeRate,
  TradeStatus,
} from '../../types'
import { SwapperName } from '../../types'
import { checkAptosSwapStatus, isExecutableTradeQuote } from '../../utils'
import { getPanoraTradeData } from './swapperApi/getPanoraTradeData'
import { getTradeQuote } from './swapperApi/getTradeQuote'
import { getTradeRate } from './swapperApi/getTradeRate'

export const panoraApi: SwapperApi = {
  getTradeQuote: (
    input: CommonTradeQuoteInput,
    deps: SwapperDeps,
  ): Promise<Result<TradeQuote[], SwapErrorRight>> => {
    return getTradeQuote(input, deps)
  },

  getTradeRate: (
    input: GetTradeRateInput,
    deps: SwapperDeps,
  ): Promise<Result<TradeRate[], SwapErrorRight>> => {
    return getTradeRate(input, deps)
  },

  getUnsignedAptosTransaction: async ({
    stepIndex,
    tradeQuote,
    from,
    assertGetAptosChainAdapter,
    config,
  }: GetUnsignedAptosTransactionArgs) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = tradeQuote.steps[stepIndex ?? 0]
    if (!step) throw new Error(`No step at index ${stepIndex}`)

    const { accountNumber, sellAsset, buyAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } =
      step

    const adapter = assertGetAptosChainAdapter(sellAsset.chainId)

    // Re-fetch quote from Panora to get fresh txData for execution
    const slippagePercentage = bnOrZero(
      tradeQuote.slippageTolerancePercentageDecimal ??
        getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Panora),
    )
      .times(100)
      .toNumber()

    const tradeDataResult = await getPanoraTradeData({
      sellAsset,
      buyAsset,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      receiveAddress: from,
      affiliateBps: tradeQuote.affiliateBps,
      slippagePercentage,
      config,
    })

    if (tradeDataResult.isErr()) {
      throw new Error(`Failed to get Panora trade data: ${tradeDataResult.unwrapErr().message}`)
    }

    const { txData } = tradeDataResult.unwrap()

    return adapter.buildEntryFunctionApiTransaction({
      from,
      accountNumber: accountNumber ?? 0,
      data: {
        function: txData.function as `${string}::${string}::${string}`,
        typeArguments: txData.type_arguments,
        functionArguments: txData.arguments,
      },
    })
  },

  getAptosTransactionFees: ({ tradeQuote, stepIndex }: GetUnsignedAptosTransactionArgs) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = tradeQuote.steps[stepIndex ?? 0]
    if (!step) throw new Error('Missing step')
    if (!step.feeData.networkFeeCryptoBaseUnit) {
      throw new Error('Missing network fee in quote')
    }
    return Promise.resolve(step.feeData.networkFeeCryptoBaseUnit)
  },

  checkTradeStatus: ({ swap, assertGetAptosChainAdapter }): Promise<TradeStatus> => {
    if (!swap?.sellTxHash) {
      return Promise.resolve({
        status: TxStatus.Unknown,
        buyTxHash: undefined,
        message: undefined,
      })
    }

    return checkAptosSwapStatus({
      txHash: swap.sellTxHash,
      address: swap.receiveAddress,
      assertGetAptosChainAdapter,
    })
  },
}
