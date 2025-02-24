import { createQueryKeys } from '@lukemorales/query-key-factory'
import type { AccountId } from '@shapeshiftmonorepo/caip'
import { fromAccountId } from '@shapeshiftmonorepo/caip'

import { assertGetChainAdapter } from '@/lib/utils'

export const accountManagement = createQueryKeys('accountManagement', {
  getAccount: (accountId: AccountId) => ({
    queryKey: ['getAccount', accountId],
    queryFn: async () => {
      const { chainId, account: pubkey } = fromAccountId(accountId)
      const adapter = assertGetChainAdapter(chainId)
      const account = await adapter.getAccount(pubkey)
      return account
    },
  }),
})
