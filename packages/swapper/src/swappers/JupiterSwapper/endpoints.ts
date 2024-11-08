import { fromChainId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { Result } from '@sniptt/monads/build'
import type { InterpolationOptions } from 'node-polyglot'

import type {
  CommonTradeQuoteInput,
  GetUnsignedSolanaTransactionArgs,
  SolanaTransactionRequest,
  TradeRate,
} from '../../types'
import {
  type GetTradeQuoteInput,
  type SwapErrorRight,
  type SwapperApi,
  type TradeQuote,
} from '../../types'
import { isExecutableTradeQuote } from '../../utils'

export const jupiterApi: SwapperApi = {
  getTradeQuote: (
    input: CommonTradeQuoteInput,
    // { assertGetSolanaChainAdapter, assetsById, config }: SwapperDeps,
  ): Promise<Result<TradeQuote[], SwapErrorRight>> => {
    return [] as unknown as Promise<Result<TradeRate[], SwapErrorRight>>
  },
  getTradeRate: (
    input: GetTradeQuoteInput,
    // { assertGetSolanaChainAdapter, assetsById, config }: SwapperDeps,
  ): Promise<Result<TradeRate[], SwapErrorRight>> => {
    return [] as unknown as Promise<Result<TradeRate[], SwapErrorRight>>
  },
  getUnsignedSolanaTransaction: ({
    chainId,
    from,
    tradeQuote,
    config,
  }: GetUnsignedSolanaTransactionArgs): Promise<SolanaTransactionRequest> => {
    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute trade')

    return {
      to: '',
      from,
      value: '',
      data: '',
      chainId: Number(fromChainId(chainId).chainReference),
      // Use the higher amount of the node or the API, as the node doesn't always provide enough gas padding for
      // total gas used.
      gasLimit: '1',
      // @TODO: remove this
    } as unknown as Promise<SolanaTransactionRequest>
  },

  checkTradeStatus: (): Promise<{
    status: TxStatus
    buyTxHash: string | undefined
    message: string | [string, InterpolationOptions] | undefined
  }> => {
    try {
      return {
        buyTxHash: '',
        status: TxStatus.Pending,
        message: '',
      } as unknown as Promise<{
        status: TxStatus
        buyTxHash: string | undefined
        message: string | [string, InterpolationOptions] | undefined
      }>
    } catch (e) {
      console.error(e)
      return {
        buyTxHash: undefined,
        status: TxStatus.Unknown,
        message: undefined,
      } as unknown as Promise<{
        status: TxStatus
        buyTxHash: string | undefined
        message: string | [string, InterpolationOptions] | undefined
      }>
    }
  },
}
