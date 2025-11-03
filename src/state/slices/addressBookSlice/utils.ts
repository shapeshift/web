import { CHAIN_NAMESPACE, fromAccountId, fromChainId } from '@shapeshiftoss/caip'

import type { AddressBookEntry } from '@/state/slices/addressBookSlice/types'

export const isDuplicateEntry = (
  entries: Record<string, AddressBookEntry>,
  newEntry: AddressBookEntry,
): boolean => {
  if (newEntry.isInternal) {
    return newEntry.accountId in entries
  }

  if (!newEntry.isExternal) {
    throw new Error('Invalid entry type')
  }

  const { chainId } = fromAccountId(newEntry.accountId)
  const { chainNamespace } = fromChainId(chainId)
  const normalizedAddress = newEntry.address.toLowerCase()

  // For EVM chains, check if this address exists on ANY EVM chain
  if (chainNamespace === CHAIN_NAMESPACE.Evm) {
    return Object.values(entries).some(entry => {
      if (!entry.isExternal) return false
      const { chainId: entryChainId } = fromAccountId(entry.accountId)
      const entryChainNamespace = fromChainId(entryChainId).chainNamespace

      return (
        entryChainNamespace === CHAIN_NAMESPACE.Evm &&
        entry.address.toLowerCase() === normalizedAddress
      )
    })
  }

  // For non-EVM chains, use exact key match
  return newEntry.accountId in entries
}
