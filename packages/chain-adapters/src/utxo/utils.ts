import type * as unchained from '@shapeshiftoss/unchained-client'

import type { TransferType } from '../types'

export const getAddresses = (tx: unchained.utxo.types.Tx, accountAddresses: string[]) => {
  const addressesByType: Record<TransferType, string[]> = { Contract: [], Receive: [], Send: [] }

  tx.vin?.forEach(vin => addressesByType['Send'].push(...(vin.addresses ?? [])))
  tx.vout?.forEach(vout => addressesByType['Receive'].push(...(vout.addresses ?? [])))

  // unique addresses only
  addressesByType['Send'] = [...new Set(addressesByType['Send'])]
  addressesByType['Receive'] = [...new Set(addressesByType['Receive'])]

  // all addresses
  const addresses = [...new Set(Object.values(addressesByType).flat())]

  // all addresses owned by pubkey
  const ownedAddresses = addresses.filter(addr => accountAddresses.includes(addr))

  const owned = (address: string) => ownedAddresses.includes(address)
  const unowned = (address: string) => !ownedAddresses.includes(address)

  return {
    addresses,
    ownedAddresses,
    receiveAddresses: addressesByType['Receive'],
    ownedReceiveAddresses: addressesByType['Receive'].filter(owned),
    unownedReceiveAddresses: addressesByType['Receive'].filter(unowned),
    sendAddresses: addressesByType['Send'],
    ownedSendAddresses: addressesByType['Send'].filter(owned),
    unownedSendAddresses: addressesByType['Send'].filter(unowned),
  }
}
