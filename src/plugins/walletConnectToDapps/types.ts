import type { FeeDataKey } from '@shapeshiftoss/chain-adapters'

export type RegistryItem = {
  category: string
  id: string
  homepage: string
  name: string
  image: string
}

export type ConfirmData = {
  nonce?: string
  gasLimit?: string
  speed: WalletConnectFeeDataKey
  customFee?: {
    baseFee: string
    priorityFee: string
  }
}

export type TransactionParams = {
  from: string
  to: string
  data: string
  gas?: string
  gasPrice?: string
  value?: string
  nonce?: string
}

export type WalletConnectFeeDataKey = FeeDataKey | 'custom'
