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
  firstAccountIdsWithActivityAndMetadata: (
    chainId: ChainId,
    wallet: HDWallet | null,
    walletDeviceId: string,
    accountNumberLimit: number,
  ) => ({
    queryKey: [
      'firstAccountIdsWithActivityAndMetadata',
      chainId,
      walletDeviceId,
      accountNumberLimit,
    ],
    queryFn: async () => {
      let accountNumber = 0

      const accounts: {
        accountId: AccountId
        accountMetadata: AccountMetadata
        hasActivity: boolean
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

          if (accountNumber >= accountNumberLimit) {
            break
          }

          accounts.push({ accountId, accountMetadata, hasActivity })
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
