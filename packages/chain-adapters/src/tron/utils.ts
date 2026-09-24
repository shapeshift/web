import { TronWeb } from 'tronweb'

// Bandwidth is the signed tx byte size (raw_data + signature), measured on mainnet
export const SIGNED_TX_OVERHEAD_BYTES = 134 // billed on top of raw_data: signature (65 + tags) and the node's 64-byte result slot
export const CONTRACT_CALL_OVERHEAD_BYTES = 145 + SIGNED_TX_OVERHEAD_BYTES // TriggerSmartContract envelope, on top of the calldata

export const getTronContractCallBandwidthBytes = (data: string): number =>
  (data.startsWith('0x') ? data.length - 2 : data.length) / 2 + CONTRACT_CALL_OVERHEAD_BYTES

// The chain's ceiling on a single call's fee_limit
const TRON_MAX_FEE_LIMIT_SUN = 15_000_000_000
export const TRON_DEFAULT_FEE_LIMIT_SUN = 100_000_000

// Energy burns up to fee_limit and is lost when a call runs out, so the limit is what a user can lose. Twice the
// estimate clears drift past the energy margin, while a lapse in a deployer's energy subsidy fails cheaply instead
// of paying the full call
export const TRON_FEE_LIMIT_HEADROOM = 2

export const getTronFeeLimit = (networkFeeCryptoBaseUnit: string | undefined): string => {
  const estimate = Number(networkFeeCryptoBaseUnit)
  if (!Number.isFinite(estimate) || estimate <= 0) return String(TRON_DEFAULT_FEE_LIMIT_SUN)

  return String(Math.min(Math.ceil(estimate * TRON_FEE_LIMIT_HEADROOM), TRON_MAX_FEE_LIMIT_SUN))
}

// A recipient nobody has touched, for pricing transfers that always land on a fresh address (a fresh
// TRC20 balance slot costs ~66k more energy than topping up an existing holder)
export const generateFreshTronAddress = (): string => {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(20))
  const body = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')

  return TronWeb.address.fromHex(`41${body}`)
}

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
