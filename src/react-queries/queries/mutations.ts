import { createMutationKeys } from '@lukemorales/query-key-factory'
import { fromAssetId, tronChainId } from '@shapeshiftoss/caip'

import { approve } from '@/lib/utils/evm/approve'
import type { MaybeApproveInputWithWallet } from '@/lib/utils/evm/types'
import { approveTron } from '@/lib/utils/tron/approve'
import type { MaybeApproveTronInputWithWallet } from '@/lib/utils/tron/types'

export const mutations = createMutationKeys('mutations', {
  approve: ({
    assetId,
    spender,
    amountCryptoBaseUnit,
    accountNumber,
    wallet,
    from,
    pubKey,
  }: (MaybeApproveInputWithWallet | MaybeApproveTronInputWithWallet) & { pubKey?: string }) => ({
    mutationKey: ['approve', { assetId, accountNumber, amountCryptoBaseUnit, spender }],
    mutationFn: (_: void) => {
      console.log('[APPROVE DEBUG] Mutation called with:', {
        assetId,
        spender,
        amountCryptoBaseUnit,
        accountNumber,
        from,
        hasWallet: !!wallet,
      })

      if (!assetId) throw new Error('assetId is required')
      if (!spender) throw new Error('spender is required')
      if (amountCryptoBaseUnit === undefined) throw new Error('non-undefined amount is required')
      if (!wallet) throw new Error('wallet is required')
      if (accountNumber === undefined) {
        console.error(
          '[APPROVE DEBUG] accountNumber is undefined! This should not happen for approval',
        )
        throw new Error('accountNumber is required')
      }
      if (!from) throw new Error('from is required')

      const { chainId } = fromAssetId(assetId)
      console.log('[APPROVE DEBUG] Dispatching to:', chainId === tronChainId ? 'TRON' : 'EVM')

      // Handle TRON approvals
      if (chainId === tronChainId) {
        return approveTron({
          assetId,
          accountNumber,
          amountCryptoBaseUnit,
          spender,
          wallet,
          from,
        })
      }

      // Handle EVM approvals
      return approve({
        assetId,
        accountNumber,
        amountCryptoBaseUnit,
        spender,
        wallet,
        from,
        pubKey,
      })
    },
  }),
})
