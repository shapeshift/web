import { createQueryKeys } from '@lukemorales/query-key-factory'
import type { AccountId } from '@shapeshiftoss/caip'
import { type ChainId, fromAccountId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { deriveAccountIdsAndMetadata } from 'lib/account/account'
import { assertGetChainAdapter } from 'lib/utils'
import { checkAccountHasActivity } from 'state/slices/portfolioSlice/utils'

const getAccountIdsWithActivity = async (
  accountNumber: number,
  chainId: ChainId,
  wallet: HDWallet,
) => {
  const input = { accountNumber, chainIds: [chainId], wallet }
  const accountIdsAndMetadata = await deriveAccountIdsAndMetadata(input)
  const [accountId] = Object.keys(accountIdsAndMetadata)

  const { account: pubkey } = fromAccountId(accountId)
  const adapter = assertGetChainAdapter(chainId)
  const account = await adapter.getAccount(pubkey)
  const hasActivity = checkAccountHasActivity(account)

  return { accountId, hasActivity }
}

export const accountManagement = createQueryKeys('accountManagement', {
  accountIdWithActivity: (accountNumber: number, chainId: ChainId, wallet: HDWallet) => ({
    queryKey: ['accountIdWithActivity', chainId, wallet.getDeviceID(), accountNumber],
    queryFn: () => {
      return getAccountIdsWithActivity(accountNumber, chainId, wallet)
    },
  }),
  allAccountIdsWithActivity: (
    chainId: ChainId,
    wallet: HDWallet | null,
    numEmptyAccountsToInclude: number,
  ) => ({
    queryKey: [
      'allAccountIdsWithActivity',
      chainId,
      wallet?.getDeviceID() ?? '',
      numEmptyAccountsToInclude,
    ],
    queryFn: async () => {
      let accountNumber = 0
      let emptyAccountCount = 0
      const accounts: { accountNumber: number; accountId: AccountId }[] = []

      if (!wallet) return []

      while (true) {
        try {
          const accountResult = await getAccountIdsWithActivity(accountNumber, chainId, wallet)

          if (!accountResult) break

          const { accountId, hasActivity } = accountResult

          if (!hasActivity) emptyAccountCount++

          if (!hasActivity && emptyAccountCount > numEmptyAccountsToInclude) {
            break
          }

          accounts.push({ accountNumber, accountId })
        } catch (error) {
          console.error(error)
          break
        }

        accountNumber++
      }

      return accounts
    },
  }),
})
