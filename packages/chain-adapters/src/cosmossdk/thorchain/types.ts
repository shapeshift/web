import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { Bip44Params } from '@shapeshiftoss/types'

export type BuildDepositTxInput = {
  memo: string
  value: string
  wallet: HDWallet
  gas: string
  fee: string
  bip44Params: Bip44Params
}
