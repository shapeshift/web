import { TronWeb } from 'tronweb'

// Bandwidth is the signed tx byte size (raw_data + signature), measured on mainnet
export const SIGNED_TX_OVERHEAD_BYTES = 134 // billed on top of raw_data: signature (65 + tags) and the node's 64-byte result slot
export const CONTRACT_CALL_OVERHEAD_BYTES = 145 + SIGNED_TX_OVERHEAD_BYTES // TriggerSmartContract envelope, on top of the calldata

export const getTronContractCallBandwidthBytes = (data: string): number =>
  (data.startsWith('0x') ? data.length - 2 : data.length) / 2 + CONTRACT_CALL_OVERHEAD_BYTES

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
