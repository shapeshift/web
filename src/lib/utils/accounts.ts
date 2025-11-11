import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { accountIdToChainId, fromAccountId } from '@shapeshiftoss/caip'
import type { Account } from '@shapeshiftoss/chain-adapters'
import type { Asset, KnownChainIds, PartialRecord, UtxoChainId } from '@shapeshiftoss/types'
import { isUtxoChainId } from '@shapeshiftoss/utils'

import { middleEllipsis } from '.'
import { isUtxoAccountId } from './utxo'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { queryClient } from '@/context/QueryClientProvider/queryClient'
import { accountManagement } from '@/react-queries/queries/accountManagement'

export const getAccountTitle = (accountId: AccountId, assets: PartialRecord<AssetId, Asset>) => {
  const isUtxoAccount = isUtxoAccountId(accountId)
  const feeAssetId = accountIdToFeeAssetId(accountId ?? '') ?? ''
  return isUtxoAccount
    ? assets[feeAssetId]?.name ?? ''
    : middleEllipsis(fromAccountId(accountId).account)
}

export const accountIdToFeeAssetId = (accountId: AccountId): AssetId | undefined =>
  getChainAdapterManager().get(accountIdToChainId(accountId))?.getFeeAssetId()

export const accountIdToChainDisplayName = (accountId: AccountId): AssetId | undefined =>
  getChainAdapterManager().get(accountIdToChainId(accountId))?.getDisplayName()

// 0 is valid but falsy, dum language
export const isValidAccountNumber = (
  accountNumber: number | undefined | null,
): accountNumber is number => {
  if (accountNumber === undefined) return false
  if (accountNumber === null) return false
  return Number.isInteger(accountNumber) && accountNumber >= 0
}

export const isUtxoAccountWithAddresses = (
  account: Account<KnownChainIds>,
): account is Account<UtxoChainId> => {
  return Boolean(isUtxoChainId(account?.chainId) && 'addresses' in account.chainSpecific)
}

export const findUtxoAccountIdByAddress = (
  address: string,
  accountIds: AccountId[],
  chainId: string,
): AccountId | null => {
  const normalizedAddress = address.toLowerCase()

  const relevantAccountIds = accountIds.filter(accountId => {
    const { chainId: accountChainId } = fromAccountId(accountId)
    return accountChainId === chainId
  })

  for (const accountId of relevantAccountIds) {
    try {
      // Try to get the account data from the cache synchronously
      const account = queryClient.getQueryData<Account<KnownChainIds>>(
        accountManagement.getAccount(accountId).queryKey,
      )

      if (!account || !isUtxoAccountWithAddresses(account)) {
        continue
      }

      const addresses = account.chainSpecific.addresses?.map(addr => addr.pubkey) ?? []
      const hasMatch = addresses.some(addr => addr && addr.toLowerCase() === normalizedAddress)

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
