import { TronWeb } from 'tronweb'

// Bandwidth is the signed tx byte size (raw_data + signature), measured on mainnet
export const SIGNED_TX_OVERHEAD_BYTES = 134 // billed on top of raw_data: signature (65 + tags) and the node's 64-byte result slot
export const CONTRACT_CALL_OVERHEAD_BYTES = 145 + SIGNED_TX_OVERHEAD_BYTES // TriggerSmartContract envelope, on top of the calldata

export const getTronContractCallBandwidthBytes = (data: string): number =>
  (data.startsWith('0x') ? data.length - 2 : data.length) / 2 + CONTRACT_CALL_OVERHEAD_BYTES

// Energy burned past fee_limit fails the call and is lost, so the limit is what a user can lose: 3x the estimate
// clears every drift measured past the energy margin, and a lapsed deployer subsidy fails cheaply
export const TRON_FEE_LIMIT_HEADROOM = 3
// Near-free calls get a limit a single state-dependent branch can't exhaust
export const TRON_MIN_FEE_LIMIT_SUN = 10_000_000
export const TRON_DEFAULT_FEE_LIMIT_SUN = 100_000_000

export const getTronFeeLimit = (networkFeeCryptoBaseUnit: string | undefined): number => {
  const estimate = Number(networkFeeCryptoBaseUnit)
  if (!Number.isFinite(estimate) || estimate <= 0) return TRON_DEFAULT_FEE_LIMIT_SUN

  const headroom = Math.ceil(estimate * TRON_FEE_LIMIT_HEADROOM)
  // a ceiling under the estimate could only ever run the call out of energy
  const ceiling = Math.max(TRON_DEFAULT_FEE_LIMIT_SUN, Math.ceil(estimate))

  return Math.min(Math.max(headroom, TRON_MIN_FEE_LIMIT_SUN), ceiling)
}

// A recipient nobody has touched, for pricing transfers that always land on a fresh TRC20 balance slot
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
