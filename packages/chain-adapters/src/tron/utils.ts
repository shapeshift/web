import { tronChainId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { TronWeb } from 'tronweb'

export const isTronChainId = (chainId: string): chainId is KnownChainIds.TronMainnet => {
  return chainId === tronChainId
}

// Normalizes an address to Tron base58: base58 passes through; a 0x-hex address is the 20-byte body
// under Tron's 0x41 prefix, so prepend it before decoding; a raw hex string decodes as-is.
export const toTronBase58 = (address: string): string => {
  if (address.startsWith('T')) return address
  if (address.startsWith('0x')) return TronWeb.address.fromHex(`41${address.slice(2)}`)
  return TronWeb.address.fromHex(address)
}

// Normalizes an address to its 0x-hex 20-byte body; base58 converts via
// TronWeb, a raw 41-prefixed hex swaps its prefix, and a 0x-hex address passes through.
export const toTronHex = (address: string): string => {
  if (address.startsWith('0x')) return address
  const hex = address.startsWith('T') ? TronWeb.address.toHex(address) : address
  return `0x${hex.replace(/^41/, '')}`
}
