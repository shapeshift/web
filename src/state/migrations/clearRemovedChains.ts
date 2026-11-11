import type { ChainId } from '@shapeshiftoss/caip'
import { ethChainId, toAccountId } from '@shapeshiftoss/caip'
import mapValues from 'lodash/mapValues'
import type { PersistPartial } from 'redux-persist/es/persistReducer'

import type { AddressBookState } from '@/state/slices/addressBookSlice/addressBookSlice'
import type { AssetsState } from '@/state/slices/assetsSlice/assetsSlice'

const REMOVED_CHAIN_IDS = new Set<ChainId>([
  'eip155:2741', // abstract
  'eip155:80094', // berachain
  'eip155:81457', // blast
  'eip155:5064014', // ethereal
  'eip155:747', // flowEvm
  'eip155:43111', // hemi
  'eip155:59144', // linea
  'eip155:34443', // mode
  'eip155:98866', // plume
  'eip155:534352', // scroll
  'eip155:1868', // soneium
  'eip155:1514', // story
  'eip155:480', // worldchain
  'eip155:324', // zksyncera
])

const isOnRemovedChain = (id: string | undefined): boolean => {
  if (!id) return false
  const [prefix = ''] = id.split('/')
  const [namespace, reference] = prefix.split(':')
  return REMOVED_CHAIN_IDS.has(`${namespace}:${reference}`)
}

const omitRemovedIds = <T extends string>(ids: T[] = []): T[] =>
  ids.filter(id => !isOnRemovedChain(id))

const omitRemovedKeys = <T>(record: Partial<Record<string, T>> = {}): Partial<Record<string, T>> =>
  Object.fromEntries(Object.entries(record).filter(([key]) => !isOnRemovedChain(key)))

// External EVM contacts are stored once under the chain they were added on and shown on every EVM chain
export const clearRemovedChainAddressBook = (
  state: AddressBookState,
): AddressBookState & PersistPartial => {
  const byAccountId = omitRemovedKeys(state.byAccountId)

  Object.values(state.byAccountId).forEach(entry => {
    if (!entry?.isExternal || !isOnRemovedChain(entry.accountId)) return

    const address = entry.address.toLowerCase()
    const isSaved = Object.values(byAccountId).some(
      saved =>
        saved?.isExternal &&
        saved.accountId.startsWith('eip155:') &&
        saved.address.toLowerCase() === address,
    )
    if (isSaved) return

    const accountId = toAccountId({ chainId: ethChainId, account: entry.address })
    byAccountId[accountId] = { ...entry, accountId }
  })

  return { ...state, byAccountId } as AddressBookState & PersistPartial
}

export const clearRemovedChainAssets = (state: AssetsState): AssetsState & PersistPartial =>
  ({
    ...state,
    byId: omitRemovedKeys(state.byId),
    ids: omitRemovedIds(state.ids),
    relatedAssetIndex: mapValues(state.relatedAssetIndex, ids => ids && omitRemovedIds(ids)),
    runtimeAssetIds: omitRemovedIds(state.runtimeAssetIds),
    customAssetIds: omitRemovedIds(state.customAssetIds),
  }) as AssetsState & PersistPartial
