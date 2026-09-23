import { TronWeb } from 'tronweb'

// Base58 passes through; 0x-hex is either the bare 20-byte body (needs the 41 prefix) or already 41-prefixed
export const toTronBase58 = (address: string): string => {
  if (address.startsWith('T')) return address
  if (address.startsWith('0x')) {
    const hex = address.slice(2)
    return TronWeb.address.fromHex(hex.length === 40 ? `41${hex}` : hex)
  }
  return TronWeb.address.fromHex(address)
}

// The 0x-hex 20-byte body: base58 decodes, 41-prefixed hex swaps its prefix, 0x-hex passes through
export const toTronHex = (address: string): string => {
  if (address.startsWith('0x')) return address
  const hex = address.startsWith('T') ? TronWeb.address.toHex(address) : address
  return `0x${hex.length === 42 ? hex.slice(2) : hex}`
}
