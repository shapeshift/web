import { fromChainId } from '@shapeshiftoss/caip'
import type { SolanaSignTx } from '@shapeshiftoss/hdwallet-core'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { InterpolationOptions } from 'node-polyglot'

import type { GetUnsignedSolanaTransactionArgs } from '../../types'
import { type SwapperApi } from '../../types'
import { isExecutableTradeQuote } from '../../utils'
import { getTradeQuote, getTradeRate } from './swapperApi/getTradeQuote'

export const jupiterApi: SwapperApi = {
  getTradeQuote,
  getTradeRate,
  getUnsignedSolanaTransaction: ({
    chainId,
    from,
    tradeQuote,
  }: GetUnsignedSolanaTransactionArgs): Promise<SolanaSignTx> => {
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
    } as unknown as Promise<SolanaSignTx>
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
