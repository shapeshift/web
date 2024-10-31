import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { InterpolationOptions } from 'node-polyglot'

import type { SwapperApi } from '../../types'
import { getTradeQuote } from './swapperApi/getTradeQuote'
import { getUnsignedEvmTransaction } from './swapperApi/getUnsignedEvmTransaction'
import { getUnsignedUtxoTransaction } from './swapperApi/getUnsignedUtxoTransaction'

export const chainflipApi: SwapperApi = {
  getTradeQuote,
  getUnsignedEvmTransaction,
  getUnsignedUtxoTransaction,
  checkTradeStatus: async (
    // @ts-ignore TODO(gomes): implement me
    input,
  ): Promise<{
    status: TxStatus
    buyTxHash: string | undefined
    message: string | [string, InterpolationOptions] | undefined
  }> => {
    // TODO(gomes): implement me
    return {
      buyTxHash: undefined,
      status: TxStatus.Unknown,
      message: undefined,
    }
  },
}
