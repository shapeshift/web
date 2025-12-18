import { Transaction } from '@cetusprotocol/aggregator-sdk/node_modules/@mysten/sui/transactions'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../constants'
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
import { SwapperName } from '../../types'
import { checkSuiSwapStatus, getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'
import { getTradeQuote } from './swapperApi/getTradeQuote'
import { getTradeRate } from './swapperApi/getTradeRate'
import { findBestRoute, getAggregatorClient, getCoinType, getSuiClient } from './utils/helpers'

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
    config,
  }: GetUnsignedSuiTransactionArgs) => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

    const step = getExecutableTradeStep(tradeQuote, stepIndex)

    const { accountNumber, sellAsset, buyAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } =
      step

    const adapter = assertGetSuiChainAdapter(sellAsset.chainId)
    const rpcUrl = config.VITE_SUI_NODE_URL
    const client = getAggregatorClient(rpcUrl)
    const suiClient = getSuiClient(rpcUrl)

    const sellCoinType = getCoinType(sellAsset)
    const buyCoinType = getCoinType(buyAsset)

    const routerData = await findBestRoute(
      client,
      sellCoinType,
      buyCoinType,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
    )

    if (!routerData) {
      throw new Error(`No route found for ${sellAsset.symbol}/${buyAsset.symbol}`)
    }

    const slippage = bnOrZero(
      tradeQuote.slippageTolerancePercentageDecimal ??
        getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Cetus),
    ).toNumber()

    const txb = new Transaction()

    txb.setSender(from)

    await client.fastRouterSwap({
      router: routerData,
      slippage,
      txb,
      refreshAllCoins: true,
    })

    const transactionJson = await txb.toJSON({ client: suiClient })
    const transactionBytes = await txb.build({ client: suiClient })

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
      transactionJson,
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
