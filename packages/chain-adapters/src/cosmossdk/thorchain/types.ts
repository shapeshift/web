import type { Bip44Params } from '@shapeshiftmonorepo/types'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'

export type BuildDepositTxInput = {
  memo: string
  value: string
  wallet: HDWallet
  gas: string
  fee: string
  bip44Params: Bip44Params
}
