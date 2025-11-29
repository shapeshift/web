import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { Result } from '@sniptt/monads'

import type {
  CommonTradeQuoteInput,
  GetTradeRateInput,
  GetUnsignedSuiTransactionArgs,
  SwapErrorRight,
  SwapperApi,
  SwapperDeps,
  TradeQuote,
  TradeRate,
  TradeStatus,
} from '../../types'
import { checkSuiSwapStatus, getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import { getTradeQuote } from './swapperApi/getTradeQuote'
import { getTradeRate } from './swapperApi/getTradeRate'
import {
  calculateAmountLimit,
  calculateSwapAmounts,
  determineSwapDirection,
  findBestPool,
  getCetusSDK,
  getCoinType,
} from './utils/helpers'

export const cetusApi: SwapperApi = {
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

  getUnsignedSuiTransaction: async ({
    stepIndex,
    tradeQuote,
    from,
    assertGetSuiChainAdapter,
  }: GetUnsignedSuiTransactionArgs) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { accountNumber, sellAsset, buyAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } =
      step

    const adapter = assertGetSuiChainAdapter(sellAsset.chainId)
    const sdk = await getCetusSDK()

    sdk.senderAddress = from

    const sellCoinType = getCoinType(sellAsset)
    const buyCoinType = getCoinType(buyAsset)

    const pool = await findBestPool(sdk, sellCoinType, buyCoinType)

    if (!pool) {
      throw new Error(`No liquidity pool found for ${sellAsset.symbol}/${buyAsset.symbol}`)
    }

    const swapResult = await calculateSwapAmounts(
      sdk,
      pool,
      sellAsset,
      buyAsset,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
    )

    if (!swapResult) {
      throw new Error(`Failed to calculate swap for ${sellAsset.symbol}/${buyAsset.symbol}`)
    }

    const a2b = determineSwapDirection(pool, sellCoinType, buyCoinType)

    const amountLimit = calculateAmountLimit(
      swapResult.estimatedAmountOut,
      tradeQuote.slippageTolerancePercentageDecimal,
      false,
    )

    const tx = await sdk.Swap.createSwapTransactionPayload({
      pool_id: pool.poolAddress,
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      a2b,
      by_amount_in: true,
      amount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      amount_limit: amountLimit,
    })

    const transactionBytes = await tx.build({ client: adapter.getSuiClient() })

    const intentMessage = new Uint8Array(3 + transactionBytes.length)
    intentMessage[0] = 0
    intentMessage[1] = 0
    intentMessage[2] = 0
    intentMessage.set(transactionBytes, 3)

    const bip44Params = adapter.getBip44Params({ accountNumber })

    const addressNList = [
      bip44Params.purpose,
      bip44Params.coinType,
      bip44Params.accountNumber,
      ...(bip44Params.isChange !== undefined ? [bip44Params.isChange ? 1 : 0] : []),
      ...(bip44Params.addressIndex !== undefined ? [bip44Params.addressIndex] : []),
    ]

    return {
      addressNList,
      intentMessageBytes: intentMessage,
    }
  },

  getSuiTransactionFees: ({ tradeQuote, stepIndex }: GetUnsignedSuiTransactionArgs) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)
    if (!step.feeData.networkFeeCryptoBaseUnit) {
      throw new Error('Missing network fee in quote')
    }
    return Promise.resolve(step.feeData.networkFeeCryptoBaseUnit)
  },

  checkTradeStatus: ({ swap, assertGetSuiChainAdapter }): Promise<TradeStatus> => {
    if (!swap?.sellTxHash) {
      return Promise.resolve({
        status: TxStatus.Unknown,
        buyTxHash: undefined,
        message: undefined,
      })
    }

    return checkSuiSwapStatus({
      txHash: swap.sellTxHash,
      address: swap.receiveAddress,
      assertGetSuiChainAdapter,
    })
  },
}
