import { TronWeb } from 'tronweb'

// Bandwidth is the signed tx byte size (raw_data + signature), measured on mainnet
export const SIGNED_TX_OVERHEAD_BYTES = 134 // billed on top of raw_data: signature (65 + tags) and the node's 64-byte result slot
export const CONTRACT_CALL_OVERHEAD_BYTES = 145 + SIGNED_TX_OVERHEAD_BYTES // TriggerSmartContract envelope, on top of the calldata

export const getTronContractCallBandwidthBytes = (data: string): number =>
  (data.startsWith('0x') ? data.length - 2 : data.length) / 2 + CONTRACT_CALL_OVERHEAD_BYTES

// What a call can burn before it fails: 3x clears every measured drift while a lapsed deployer subsidy fails cheaply
export const TRON_FEE_LIMIT_HEADROOM = 3
// Past the standard limit the ceiling scales with the estimate rather than capping a call it can't cover
export const TRON_LARGE_ESTIMATE_HEADROOM = 1.5
// Near-free calls get a limit a single state-dependent branch can't exhaust
export const TRON_MIN_FEE_LIMIT_SUN = 10_000_000
export const TRON_DEFAULT_FEE_LIMIT_SUN = 100_000_000

export const getTronFeeLimit = (networkFeeCryptoBaseUnit: string | undefined): number => {
  const estimate = Number(networkFeeCryptoBaseUnit)
  if (!Number.isFinite(estimate) || estimate <= 0) return TRON_DEFAULT_FEE_LIMIT_SUN

  const headroom = Math.ceil(estimate * TRON_FEE_LIMIT_HEADROOM)
  const ceiling = Math.max(
    TRON_DEFAULT_FEE_LIMIT_SUN,
    Math.ceil(estimate * TRON_LARGE_ESTIMATE_HEADROOM),
  )

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

// TronGrid only parses amounts as bare JSON integers, as int64, which is more than a JS number carries
export const toRawJsonInt = (value: string): unknown => {
  const digits = value || '0'
  const json = JSON as { rawJSON?: (text: string) => unknown }
  if (json.rawJSON) return json.rawJSON(digits)

  const amount = Number(digits)
  if (!Number.isSafeInteger(amount)) {
    throw new Error(`[tron] amount ${digits} exceeds the safe integer range in this environment`)
  }
  return amount
}
