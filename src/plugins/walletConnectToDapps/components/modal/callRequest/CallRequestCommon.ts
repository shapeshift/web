import type { FeeDataKey } from '@shapeshiftoss/chain-adapters'

export type WalletConnectFeeDataKey = FeeDataKey | 'custom'
export type ConfirmData = {
  nonce?: string
  gasLimit?: string
  speed: WalletConnectFeeDataKey
  customFee?: {
    baseFee: string
    priorityFee: string
  }
}
