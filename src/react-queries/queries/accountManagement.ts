import { createQueryKeys } from '@lukemorales/query-key-factory'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'

import { assertGetChainAdapter } from '@/lib/utils'

export const accountManagement = createQueryKeys('accountManagement', {
  getAccount: (accountId: AccountId) => ({
    queryKey: ['getAccount', accountId],
    queryFn: async () => {
      const { chainId, account: pubkey } = fromAccountId(accountId)
      console.log('[Ledger Debug] getAccount called:', {
        accountId,
        chainId,
        pubkey: pubkey.slice(0, 10) + '...',
        timestamp: Date.now(),
      })
      const adapter = assertGetChainAdapter(chainId)
      try {
        const account = await adapter.getAccount(pubkey)
        console.log('[Ledger Debug] getAccount success:', {
          accountId,
          balance: account.balance,
          timestamp: Date.now(),
        })
        return account
      } catch (error) {
        console.log('[Ledger Debug] getAccount failed:', {
          accountId,
          error: error.message,
          timestamp: Date.now(),
        })
        throw error
      }
    },
  }),
})
