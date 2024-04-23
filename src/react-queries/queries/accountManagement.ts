import { createQueryKeys } from '@lukemorales/query-key-factory'
import { type ChainId, fromAccountId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { deriveAccountIdsAndMetadata } from 'lib/account/account'
import { assertGetChainAdapter } from 'lib/utils'
import { checkAccountHasActivity } from 'state/slices/portfolioSlice/utils'

export const accountManagement = createQueryKeys('accountManagement', {
  accountIdWithActivity: (accountNumber: number, chainId: ChainId, wallet: HDWallet) => ({
    queryKey: ['accountManagement', accountNumber, chainId, wallet.getDeviceID()],
    queryFn: async () => {
      const input = { accountNumber, chainIds: [chainId], wallet }
      const accountIdsAndMetadata = await deriveAccountIdsAndMetadata(input)
      const [accountId] = Object.keys(accountIdsAndMetadata)

      const { account: pubkey } = fromAccountId(accountId)
      const adapter = assertGetChainAdapter(chainId)
      const account = await adapter.getAccount(pubkey)
      const hasActivity = checkAccountHasActivity(account)

      return { accountId, hasActivity }
    },
  }),
})
