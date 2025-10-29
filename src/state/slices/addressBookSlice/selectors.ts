import { CHAIN_NAMESPACE, fromAccountId, fromChainId } from '@shapeshiftoss/caip'
import { matchSorter } from 'match-sorter'
import { createSelector } from 'reselect'

import { addressBookSlice } from './addressBookSlice'

import { findUtxoAccountIdByAddress } from '@/lib/utils/accounts'
import { createDeepEqualOutputSelector } from '@/state/selector-utils'
import {
  selectAccountAddressParamFromFilter,
  selectChainIdParamFromFilter,
  selectSearchQueryFromFilter,
} from '@/state/selectors'
import { selectAccountIdsWithoutEvms, selectEvmAccountIds } from '@/state/slices/common-selectors'

export const selectAddressBookEntries = createSelector(
  [addressBookSlice.selectors.selectEntriesByAccountId],
  byAccountId => Object.values(byAccountId),
)

export const selectAddressBookEntriesByChainId = createDeepEqualOutputSelector(
  selectChainIdParamFromFilter,
  selectAddressBookEntries,
  (chainId, entries) => {
    if (!chainId) return []

    return entries.filter(entry => entry.chainId === chainId)
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
        { key: 'label', threshold: matchSorter.rankings.MATCHES },
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

    // For EVM chains, check if address exists in any EVM entry
    if (chainNamespace === CHAIN_NAMESPACE.Evm) {
      return entries.some(entry => {
        const entryChainNamespace = fromChainId(entry.chainId).chainNamespace
        return (
          entry.isExternal &&
          entryChainNamespace === CHAIN_NAMESPACE.Evm &&
          entry.address.toLowerCase() === normalizedAddress
        )
      })
    }

    // For non-EVM chains, check for exact chain + address match
    return entries.some(
      entry =>
        entry.isExternal &&
        entry.chainId === chainId &&
        entry.address.toLowerCase() === normalizedAddress,
    )
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
  selectAccountIdsWithoutEvms,
  selectEvmAccountIds,
  (accountAddress, chainId, accountIdsWithoutEvms, evmAccountIds) => {
    if (!accountAddress || !chainId) return null

    const normalizedAddress = accountAddress.toLowerCase()
    const { chainNamespace } = fromChainId(chainId)

    // For EVM chains, find first matching EVM account
    if (chainNamespace === CHAIN_NAMESPACE.Evm) {
      const accountId = evmAccountIds.find(accountId => {
        const { account, chainId: accountChainId } = fromAccountId(accountId)
        const accountChainNamespace = fromChainId(accountChainId).chainNamespace

        return (
          accountChainNamespace === CHAIN_NAMESPACE.Evm &&
          account.toLowerCase() === normalizedAddress
        )
      })

      return accountId ?? null
    }

    // For UTXO chains, use progressive address derivation to find matches
    // This intelligently searches in batches (20, 50, 100) to handle edge cases
    // where users have many transactions and the address is beyond the standard gap limit
    if (chainNamespace === CHAIN_NAMESPACE.Utxo) {
      return findUtxoAccountIdByAddress(accountAddress, accountIdsWithoutEvms, chainId)
    }

    // For other non-EVM and non-UTXO chains, find exact chainId + address match
    const accountId = accountIdsWithoutEvms.find(accountId => {
      const { account, chainId: accountChainId } = fromAccountId(accountId)
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
