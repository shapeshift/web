import { CHAIN_NAMESPACE, fromAccountId, fromChainId } from '@shapeshiftoss/caip'
import { matchSorter } from 'match-sorter'

import { addressBookSlice } from './addressBookSlice'

import { findUtxoAccountIdByAddress } from '@/lib/utils/account/utxo'
import { createDeepEqualOutputSelector } from '@/state/selector-utils'
import {
  selectAccountAddressParamFromFilter,
  selectChainIdParamFromFilter,
  selectSearchQueryFromFilter,
} from '@/state/selectors'
import { selectPartitionedAccountIds } from '@/state/slices/common-selectors'

export const selectAddressBookEntries = createDeepEqualOutputSelector(
  addressBookSlice.selectors.selectEntriesByAccountId,
  byAccountId => Object.values(byAccountId),
)

export const selectAddressBookEntriesByChainId = createDeepEqualOutputSelector(
  selectChainIdParamFromFilter,
  selectAddressBookEntries,
  (chainId, entries) => {
    if (!chainId) return []

    const { chainNamespace } = fromChainId(chainId)

    return entries.filter(entry => {
      const { chainId: entryChainId } = fromAccountId(entry.accountId)
      const { chainNamespace: entryChainNamespace } = fromChainId(entryChainId)

      // For EVM chains, return all EVM entries (cross-chain matching)
      if (chainNamespace === CHAIN_NAMESPACE.Evm && entryChainNamespace === CHAIN_NAMESPACE.Evm) {
        return true
      }

      // For non-EVM chains, exact chain match only
      return entryChainId === chainId
    })
  },
)

export const selectAddressBookEntriesBySearchQuery = createDeepEqualOutputSelector(
  selectChainIdParamFromFilter,
  selectSearchQueryFromFilter,
  selectAddressBookEntriesByChainId,
  (_, searchQuery, entries) => {
    if (!searchQuery) return entries

    const matchedEntries = matchSorter(entries, searchQuery, {
      keys: [
        { key: 'label', threshold: matchSorter.rankings.CONTAINS },
        { key: 'address', threshold: matchSorter.rankings.CONTAINS },
      ],
    })

    return matchedEntries
  },
)

/**
 * Checks if a given address exists in the address book
 * Handles EVM namespace matching (same address across all EVM chains)
 */
export const selectIsAddressInAddressBook = createDeepEqualOutputSelector(
  selectAccountAddressParamFromFilter,
  selectChainIdParamFromFilter,
  selectAddressBookEntries,
  (accountAddress, chainId, entries) => {
    if (!accountAddress || !chainId) return false

    const normalizedAddress = accountAddress.toLowerCase()
    const { chainNamespace } = fromChainId(chainId)

    // For EVM chains, check if address exists in any entry
    if (chainNamespace === CHAIN_NAMESPACE.Evm) {
      return entries.some(entry => {
        const { chainId: entryChainId } = fromAccountId(entry.accountId)
        const entryChainNamespace = fromChainId(entryChainId).chainNamespace
        return (
          entry.isExternal &&
          entryChainNamespace === CHAIN_NAMESPACE.Evm &&
          entry.address.toLowerCase() === normalizedAddress
        )
      })
    }

    // For non-EVM chains, check for exact chain + address match
    return entries.some(entry => {
      const { chainId: entryChainId } = fromAccountId(entry.accountId)
      return (
        entry.isExternal &&
        entryChainId === chainId &&
        entry.address.toLowerCase() === normalizedAddress
      )
    })
  },
)

/**
 * Checks if a given address belongs to one of the user's connected accounts
 * Handles EVM namespace matching (same address across all EVM chains)
 * For UTXO accounts, uses cached addresses from unchained
 * Returns the AccountId if found, null otherwise
 */
export const selectInternalAccountIdByAddress = createDeepEqualOutputSelector(
  selectAccountAddressParamFromFilter,
  selectChainIdParamFromFilter,
  selectPartitionedAccountIds,
  (accountAddress, chainId, { evmAccountIds, nonEvmAccountIds }) => {
    if (!accountAddress || !chainId) return null

    const normalizedAddress = accountAddress.toLowerCase()
    const { chainNamespace } = fromChainId(chainId)

    // For EVM chains, find first matching EVM account
    if (chainNamespace === CHAIN_NAMESPACE.Evm) {
      const accountId = evmAccountIds.find(evmAccountId => {
        const { account } = fromAccountId(evmAccountId)
        return account.toLowerCase() === normalizedAddress
      })

      return accountId ?? null
    }

    if (chainNamespace === CHAIN_NAMESPACE.Utxo) {
      return findUtxoAccountIdByAddress({
        address: accountAddress,
        accountIds: nonEvmAccountIds,
        chainId,
      })
    }

    // For non-EVM chains, find exact chainId + address match
    const accountId = nonEvmAccountIds.find(nonEvmAccountId => {
      const { account, chainId: accountChainId } = fromAccountId(nonEvmAccountId)
      return accountChainId === chainId && account.toLowerCase() === normalizedAddress
    })
    return accountId ?? null
  },
)

/**
 * Gets the external address book entry for a given address and chainId
 * Leverages selectAddressBookEntriesByChainId which handles EVM namespace matching
 */
export const selectExternalAddressBookEntryByAddress = createDeepEqualOutputSelector(
  selectAccountAddressParamFromFilter,
  selectChainIdParamFromFilter,
  selectAddressBookEntriesByChainId,
  (address, _, entries) => {
    if (!address) return null
    if (!entries || entries.length === 0) return null

    const normalizedAddress = address.toLowerCase()
    return (
      entries.find(
        entry => entry.isExternal && entry.address.toLowerCase() === normalizedAddress,
      ) ?? null
    )
  },
)
