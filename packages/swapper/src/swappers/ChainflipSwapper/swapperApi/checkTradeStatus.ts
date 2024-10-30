import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { InterpolationOptions } from 'node-polyglot'

export const checkTradeStatus = async (
  // @ts-ignore unimplemented yet
  input,
): Promise<{
  status: TxStatus
  buyTxHash: string | undefined
  message: string | [string, InterpolationOptions] | undefined
}> => {
  // TODO: Implement
  return {
    buyTxHash: undefined,
    status: TxStatus.Unknown,
    message: undefined,
  }
}
