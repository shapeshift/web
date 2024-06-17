import { createMutationKeys } from '@lukemorales/query-key-factory'
import { approve } from 'lib/utils/evm/approve'
import type { MaybeApproveInputWithWallet } from 'lib/utils/evm/types'

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
