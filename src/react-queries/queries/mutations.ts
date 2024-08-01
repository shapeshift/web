import { createMutationKeys } from '@lukemorales/query-key-factory'
import { approve } from 'lib/utils/evm/approve'
import type { MaybeApproveInputWithWallet } from 'lib/utils/evm/types'

export const mutations = createMutationKeys('mutations', {
  approve: ({
    assetId,
    spender,
    amountCryptoBaseUnit,
    accountNumber,
    wallet,
  }: MaybeApproveInputWithWallet) => ({
    mutationKey: ['approve', { assetId, accountNumber, amountCryptoBaseUnit, spender }],
    mutationFn: (_: void) => {
      if (!assetId) throw new Error('assetId is required')
      if (!spender) throw new Error('spender is required')
      if (amountCryptoBaseUnit === undefined) throw new Error('non-undefined amount is required')
      if (!wallet) throw new Error('wallet is required')
      if (accountNumber === undefined) throw new Error('accountNumber is required')

      return approve({ assetId, accountNumber, amountCryptoBaseUnit, spender, wallet })
    },
  }),
})
