import { createMutationKeys } from '@lukemorales/query-key-factory'
import { type AssetId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { approve } from 'lib/utils/evm/approve'

type ApproveInput = {
  assetId: AssetId
  spender: string
  amountCryptoBaseUnit: string
  from: string
  accountNumber: number
}
export type MaybeApproveInput = Partial<ApproveInput>

export type ApproveInputWithWallet = ApproveInput & { wallet: HDWallet }
type MaybeApproveInputWithWallet = Partial<ApproveInputWithWallet>

export const mutations = createMutationKeys('mutations', {
  approve: ({
    assetId,
    spender,
    amountCryptoBaseUnit,
    from,
    accountNumber,
    wallet,
  }: MaybeApproveInputWithWallet) => ({
    mutationKey: ['approve', { accountNumber, assetId, spender, amountCryptoBaseUnit, from }],
    mutationFn: (_: void) => {
      if (!assetId) throw new Error('assetId is required')
      if (!spender) throw new Error('spender is required')
      if (amountCryptoBaseUnit === undefined) throw new Error('non-undefined amount is required')
      if (!from) throw new Error('from address is required')
      if (!wallet) throw new Error('wallet is required')
      if (accountNumber === undefined) throw new Error('accountNumber is required')

      return approve({ assetId, spender, amountCryptoBaseUnit, from, accountNumber, wallet })
    },
  }),
})
