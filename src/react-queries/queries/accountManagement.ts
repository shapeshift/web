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

  return Promise.all(
    Object.entries(accountIdsAndMetadata).map(async ([accountId, accountMetadata]) => {
      const { account: pubkey } = fromAccountId(accountId)
      const adapter = assertGetChainAdapter(chainId)
      const account = await adapter.getAccount(pubkey)
      const hasActivity = checkAccountHasActivity(account)

      return { accountId, accountMetadata, hasActivity }
    }),
  )
}

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
      }[][] = []

      if (!wallet) return []

      while (true) {
        try {
          if (accountNumber >= accountNumberLimit) {
            break
          }

          const accountResults = await getAccountIdsWithActivityAndMetadata(
            accountNumber,
            chainId,
            wallet,
          )

          accounts.push(accountResults)
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
