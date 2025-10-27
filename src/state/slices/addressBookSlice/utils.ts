import { CHAIN_NAMESPACE, fromChainId, toAccountId } from '@shapeshiftoss/caip'

import type { AddressBookEntry } from '@/state/slices/addressBookSlice/types'

export const isDuplicateEntry = (
  entries: Record<string, AddressBookEntry>,
  newEntry: AddressBookEntry,
): boolean => {
  if (newEntry.isInternal) {
    const newKey = toAccountId({ chainId: newEntry.chainId, account: newEntry.address })
    return newKey in entries
  }

  if (!newEntry.isExternal) {
    throw new Error('Invalid entry type')
  }

  const { chainNamespace } = fromChainId(newEntry.chainId)
  const normalizedAddress = newEntry.address.toLowerCase()

  // For EVM chains, check if this address exists on ANY EVM chain
  if (chainNamespace === CHAIN_NAMESPACE.Evm) {
    return Object.values(entries).some(entry => {
      if (!entry.isExternal) return false
      const entryChainNamespace = fromChainId(entry.chainId).chainNamespace

      return (
        entryChainNamespace === CHAIN_NAMESPACE.Evm &&
        entry.address.toLowerCase() === normalizedAddress
      )
    })
  }

  // For non-EVM chains, use exact key match
  const newKey = toAccountId({ chainId: newEntry.chainId, account: newEntry.address })
  return newKey in entries
}
