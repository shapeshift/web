import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { Account } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds, UtxoChainId } from '@shapeshiftoss/types'
import { isUtxoChainId } from '@shapeshiftoss/utils'

import { queryClient } from '@/context/QueryClientProvider/queryClient'
import { accountManagement } from '@/react-queries/queries/accountManagement'

export const isUtxoAccount = (account: Account<KnownChainIds>): account is Account<UtxoChainId> => {
  return isUtxoChainId(account?.chainId)
}

export const findUtxoAccountIdByAddress = ({
  address,
  accountIds,
  chainId,
}: {
  address: string
  accountIds: AccountId[]
  chainId: ChainId
}): AccountId | null => {
  const matchingAccountIds = accountIds.filter(accountId => {
    const { chainId: accountChainId } = fromAccountId(accountId)
    return accountChainId === chainId
  })

  for (const accountId of matchingAccountIds) {
    try {
      // Try to get the account data from the cache synchronously
      const account = queryClient.getQueryData<Account<KnownChainIds>>(
        accountManagement.getAccount(accountId).queryKey,
      )

      if (!account || !isUtxoAccount(account)) {
        continue
      }

      const addresses = account.chainSpecific.addresses.map(addr => addr.pubkey)
      const hasMatch = addresses.some(addr => addr === address)

      if (hasMatch) {
        return accountId
      }
    } catch (error) {
      console.error(`Failed to check account data for ${accountId}:`, error)
      continue
    }
  }

  return null
}
