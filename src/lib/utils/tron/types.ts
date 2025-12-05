import type { AssetId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'

import type { MaybeUndefinedFields } from '@/lib/types'

type ApproveTronInput = {
  assetId: AssetId
  spender: string
  amountCryptoBaseUnit: string
  accountNumber: number
  from: string
}

export type MaybeApproveTronInput = MaybeUndefinedFields<ApproveTronInput>

export type ApproveTronInputWithWallet = ApproveTronInput & { wallet: HDWallet }
export type MaybeApproveTronInputWithWallet = MaybeUndefinedFields<ApproveTronInputWithWallet>
