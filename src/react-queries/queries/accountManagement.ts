import { createQueryKeys } from '@lukemorales/query-key-factory'
import type { AccountId } from '@shapeshiftoss/caip'
import { type ChainId, fromAccountId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadata } from '@shapeshiftoss/types'
import { deriveAccountIdsAndMetadata } from 'lib/account/account'
import { assertGetChainAdapter } from 'lib/utils'
import { checkAccountHasActivity } from 'state/slices/portfolioSlice/utils'

const getAccountIdsWithActivityAndMetadata = async (
  accountNumber: number,
  chainId: ChainId,
  wallet: HDWallet,
) => {
  const input = { accountNumber, chainIds: [chainId], wallet }
  const accountIdsAndMetadata = await deriveAccountIdsAndMetadata(input)
  const [[accountId, accountMetadata]] = Object.entries(accountIdsAndMetadata)

  const { account: pubkey } = fromAccountId(accountId)
  const adapter = assertGetChainAdapter(chainId)
  const account = await adapter.getAccount(pubkey)
  const hasActivity = checkAccountHasActivity(account)

  return { accountId, accountMetadata, hasActivity }
}

export const accountManagement = createQueryKeys('accountManagement', {
  accountIdWithActivityAndMetadata: (
    accountNumber: number,
    chainId: ChainId,
    wallet: HDWallet,
    walletDeviceId: string,
  ) => ({
    queryKey: ['accountIdWithActivityAndMetadata', chainId, walletDeviceId, accountNumber],
    queryFn: () => {
      return getAccountIdsWithActivityAndMetadata(accountNumber, chainId, wallet)
    },
  }),
  allAccountIdsWithActivityAndMetadata: (
    chainId: ChainId,
    wallet: HDWallet | null,
    walletDeviceId: string,
    numEmptyAccountsToInclude: number,
  ) => ({
    queryKey: [
      'allAccountIdsWithActivityAndMetadata',
      chainId,
      walletDeviceId,
      numEmptyAccountsToInclude,
    ],
    queryFn: async () => {
      let accountNumber = 0
      let emptyAccountCount = 0
      const accounts: {
        accountNumber: number
        accountId: AccountId
        accountMetadata: AccountMetadata
      }[] = []

      if (!wallet) return []

      while (true) {
        try {
          const accountResult = await getAccountIdsWithActivityAndMetadata(
            accountNumber,
            chainId,
            wallet,
          )

          if (!accountResult) break

          const { accountId, accountMetadata, hasActivity } = accountResult

          if (!hasActivity) emptyAccountCount++

          if (!hasActivity && emptyAccountCount > numEmptyAccountsToInclude) {
            break
          }

          accounts.push({ accountNumber, accountId, accountMetadata })
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
