import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { MaybeUndefinedFields } from 'lib/types'

type ApproveInput = {
  assetId: AssetId
  spender: string
  amountCryptoBaseUnit: string
  accountNumber: number
  from: string
}

export type MaybeApproveInput = MaybeUndefinedFields<ApproveInput>

export type ApproveInputWithWallet = ApproveInput & {
  wallet: HDWallet
  checkLedgerAppOpenIfLedgerConnected: (chainId: ChainId) => Promise<void>
}
export type MaybeApproveInputWithWallet = MaybeUndefinedFields<ApproveInputWithWallet>
