import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { InterpolationOptions } from 'node-polyglot'

import type { SwapperApi } from '../../types'
import { getTradeQuote, getTradeRate } from './swapperApi/getTradeQuote'
import { getUnsignedEvmTransaction } from './swapperApi/getUnsignedEvmTransaction'
import { getUnsignedUtxoTransaction } from './swapperApi/getUnsignedUtxoTransaction'

export const chainflipApi: SwapperApi = {
  getTradeQuote,
  getTradeRate,
  getUnsignedEvmTransaction,
  getUnsignedUtxoTransaction,
  checkTradeStatus: (
    _input,
  ): Promise<{
    status: TxStatus
    buyTxHash: string | undefined
    message: string | [string, InterpolationOptions] | undefined
  }> => {
    // TODO(gomes): implement me
    return {
      // @ts-ignore TODO(gomes): implement me
      buyTxHash: undefined,
      status: TxStatus.Unknown,
      message: undefined,
    }
  },
}
