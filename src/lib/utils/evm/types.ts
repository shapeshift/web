import type { AssetId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'

type ApproveInput = {
  assetId: AssetId
  spender: string
  amountCryptoBaseUnit: string
  from: string
  accountNumber: number
}
export type MaybeApproveInput = Partial<ApproveInput>

export type ApproveInputWithWallet = ApproveInput & { wallet: HDWallet }
export type MaybeApproveInputWithWallet = Partial<ApproveInputWithWallet>
