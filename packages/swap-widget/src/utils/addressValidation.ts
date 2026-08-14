import { CHAIN_NAMESPACE, CHAIN_REFERENCE, fromChainId } from '@shapeshiftoss/caip'
import { PublicKey } from '@solana/web3.js'
import { bech32, bech32m } from 'bech32'
import bs58check from 'bs58check'
import { decode as decodeCashAddr } from 'cashaddrjs'
import { isAddress } from 'viem'

import type { ChainId } from '../types'

// base58check version bytes (first byte of the decoded payload)
// Litecoin's pre-2018 P2SH byte (0x05) is identical to Bitcoin's P2SH byte —
// kept to support legacy BIP49 LTC wallets, at the cost of BTC/LTC P2SH ambiguity.
const VERSION_BYTES = {
  bitcoinP2PKH: 0x00,
  bitcoinP2SH: 0x05,
  litecoinP2PKH: 0x30,
  litecoinP2SH: 0x32,
  litecoinP2SHLegacy: 0x05,
  dogecoinP2PKH: 0x1e,
  dogecoinP2SH: 0x16,
} as const

// Every base58check address here is a version prefix followed by a hash160
const HASH160_LENGTH = 20

const isValidBase58Check = (address: string, allowedVersionBytes: number[]): boolean => {
  try {
    const decoded = bs58check.decode(address)
    return decoded.length === 1 + HASH160_LENGTH && allowedVersionBytes.includes(decoded[0])
  } catch {
    return false
  }
}

const isValidBech32 = (address: string, expectedHrp: string): boolean => {
  try {
    return bech32.decode(address).prefix === expectedHrp
  } catch {
    return false
  }
}

const isValidCashAddr = (address: string): boolean => {
  try {
    const { prefix, type } = decodeCashAddr(address)
    return prefix === 'bitcoincash' && (type === 'P2PKH' || type === 'P2SH')
  } catch {
    return false
  }
}

// SegWit v0 (P2WPKH/P2WSH) uses bech32; v1+ (Taproot) uses bech32m per BIP350.
const isValidSegwit = (address: string, expectedHrp: string): boolean => {
  if (address !== address.toLowerCase() && address !== address.toUpperCase()) return false
  const lower = address.toLowerCase()
  for (const codec of [bech32, bech32m]) {
    try {
      const { prefix, words } = codec.decode(lower)
      if (prefix !== expectedHrp) continue
      if (words.length === 0) continue
      const witnessVersion = words[0]
      if (witnessVersion === 0 && codec !== bech32) continue
      if (witnessVersion >= 1 && codec !== bech32m) continue

      // BIP141: any witness program is 2-40 bytes, and v0 is a 20-byte key or a 32-byte script
      const program = codec.fromWords(words.slice(1))
      if (program.length < 2 || program.length > 40) continue
      if (witnessVersion === 0 && program.length !== 20 && program.length !== 32) continue

      return true
    } catch {
      // try next codec
    }
  }
  return false
}

export const isValidBitcoinAddress = (address: string): boolean =>
  isValidBase58Check(address, [VERSION_BYTES.bitcoinP2PKH, VERSION_BYTES.bitcoinP2SH]) ||
  isValidSegwit(address, 'bc')

export const isValidBitcoinCashAddress = (address: string): boolean =>
  isValidCashAddr(address) ||
  isValidBase58Check(address, [VERSION_BYTES.bitcoinP2PKH, VERSION_BYTES.bitcoinP2SH])

export const isValidLitecoinAddress = (address: string): boolean =>
  isValidBase58Check(address, [
    VERSION_BYTES.litecoinP2PKH,
    VERSION_BYTES.litecoinP2SH,
    VERSION_BYTES.litecoinP2SHLegacy,
  ]) || isValidSegwit(address, 'ltc')

export const isValidDogecoinAddress = (address: string): boolean =>
  isValidBase58Check(address, [VERSION_BYTES.dogecoinP2PKH, VERSION_BYTES.dogecoinP2SH])

// Zcash transparent addresses use a two-byte version prefix, unlike the single-byte utxo chains
const ZCASH_VERSION_BYTES = {
  transparentP2PKH: [0x1c, 0xb8],
  transparentP2SH: [0x1c, 0xbd],
} as const

export const isValidZcashAddress = (address: string): boolean => {
  try {
    const decoded = bs58check.decode(address)
    if (decoded.length !== 2 + HASH160_LENGTH) return false

    return Object.values(ZCASH_VERSION_BYTES).some(
      ([first, second]) => decoded[0] === first && decoded[1] === second,
    )
  } catch {
    return false
  }
}

export const isValidTronAddress = (address: string): boolean => {
  if (!address.startsWith('T')) return false
  try {
    const decoded = bs58check.decode(address)
    return decoded.length === 1 + HASH160_LENGTH && decoded[0] === 0x41
  } catch {
    return false
  }
}

// TON user-friendly addresses are 36 base64url bytes: tag, workchain, 32-byte hash, then a crc16
const crc16Xmodem = (data: Uint8Array): number => {
  let crc = 0
  for (const byte of data) {
    crc ^= byte << 8
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc
}

const TON_TAG_BOUNCEABLE = 0x11
const TON_TAG_NON_BOUNCEABLE = 0x51

export const isValidTonAddress = (address: string): boolean => {
  // Raw form, workchain 0 (basechain) or -1 (masterchain)
  if (/^(0|-1):[0-9a-fA-F]{64}$/.test(address)) return true

  if (!/^[A-Za-z0-9_-]{48}$/.test(address)) return false

  try {
    const base64 = address.replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0))
    if (bytes.length !== 36) return false

    // The testnet bit is deliberately not masked off - a testnet address is not a valid destination
    if (bytes[0] !== TON_TAG_BOUNCEABLE && bytes[0] !== TON_TAG_NON_BOUNCEABLE) return false

    return crc16Xmodem(bytes.subarray(0, 34)) === ((bytes[34] << 8) | bytes[35])
  } catch {
    return false
  }
}

export const isValidSuiAddress = (address: string): boolean => /^0x[0-9a-fA-F]{64}$/.test(address)

// Contract addresses are bounded well below the felt maximum
const STARKNET_ADDRESS_BOUND = 2n ** 251n - 256n

export const isValidStarknetAddress = (address: string): boolean => {
  if (!/^0x[0-9a-fA-F]{1,64}$/.test(address)) return false

  const value = BigInt(address)
  return value > 0n && value < STARKNET_ADDRESS_BOUND
}

// Either an implicit account (a 64-char hex public key) or a named one
export const isValidNearAddress = (address: string): boolean => {
  if (/^[0-9a-f]{64}$/.test(address)) return true
  return /^(?=.{2,64}$)[a-z0-9]+([-_.][a-z0-9]+)*$/.test(address)
}

const UTXO_VALIDATORS: Record<
  string,
  { check: (a: string) => boolean; label: string; hint: string }
> = {
  [CHAIN_REFERENCE.BitcoinMainnet]: {
    check: isValidBitcoinAddress,
    label: 'Bitcoin',
    hint: 'bc1... or 1... or 3...',
  },
  [CHAIN_REFERENCE.BitcoinCashMainnet]: {
    check: isValidBitcoinCashAddress,
    label: 'Bitcoin Cash',
    hint: 'bitcoincash:q... or 1...',
  },
  [CHAIN_REFERENCE.LitecoinMainnet]: {
    check: isValidLitecoinAddress,
    label: 'Litecoin',
    hint: 'ltc1... or L... or M...',
  },
  [CHAIN_REFERENCE.DogecoinMainnet]: {
    check: isValidDogecoinAddress,
    label: 'Dogecoin',
    hint: 'D...',
  },
  [CHAIN_REFERENCE.ZcashMainnet]: {
    check: isValidZcashAddress,
    label: 'Zcash',
    hint: 't1... or t3...',
  },
}

const COSMOS_SDK_VALIDATORS: Record<string, { hrp: string; label: string }> = {
  [CHAIN_REFERENCE.CosmosHubMainnet]: { hrp: 'cosmos', label: 'Cosmos' },
  [CHAIN_REFERENCE.ThorchainMainnet]: { hrp: 'thor', label: 'THORChain' },
  [CHAIN_REFERENCE.MayachainMainnet]: { hrp: 'maya', label: 'MAYAChain' },
}

export const validateAddress = (
  address: string,
  chainId: ChainId,
): { valid: boolean; error?: string } => {
  if (!address) return { valid: false, error: 'Address is required' }

  const invalid = (label: string) => ({ valid: false, error: `Invalid ${label} address` })

  const { chainNamespace, chainReference } = fromChainId(chainId)

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Evm: {
      return isAddress(address, { strict: false }) ? { valid: true } : invalid('EVM')
    }
    case CHAIN_NAMESPACE.Utxo: {
      const utxo = UTXO_VALIDATORS[chainReference]
      if (!utxo) return { valid: false, error: 'Unsupported UTXO chain' }
      return utxo.check(address) ? { valid: true } : invalid(utxo.label)
    }
    case CHAIN_NAMESPACE.CosmosSdk: {
      const cosmosSdk = COSMOS_SDK_VALIDATORS[chainReference]
      if (!cosmosSdk) return { valid: false, error: 'Unsupported CosmosSdk chain' }
      return isValidBech32(address, cosmosSdk.hrp) ? { valid: true } : invalid(cosmosSdk.label)
    }
    case CHAIN_NAMESPACE.Solana: {
      try {
        new PublicKey(address)
        return { valid: true }
      } catch {
        return invalid('Solana')
      }
    }
    case CHAIN_NAMESPACE.Tron:
      return isValidTronAddress(address) ? { valid: true } : invalid('Tron')
    case CHAIN_NAMESPACE.Sui:
      return isValidSuiAddress(address) ? { valid: true } : invalid('Sui')
    case CHAIN_NAMESPACE.Ton:
      return isValidTonAddress(address) ? { valid: true } : invalid('TON')
    case CHAIN_NAMESPACE.Near:
      return isValidNearAddress(address) ? { valid: true } : invalid('NEAR')
    case CHAIN_NAMESPACE.Starknet:
      return isValidStarknetAddress(address) ? { valid: true } : invalid('Starknet')
    default:
      return { valid: false, error: 'Unsupported chain type' }
  }
}

export const getAddressFormatHint = (chainId: ChainId): string => {
  const { chainNamespace, chainReference } = fromChainId(chainId)

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Evm:
      return '0x...'
    case CHAIN_NAMESPACE.Utxo:
      return UTXO_VALIDATORS[chainReference]?.hint ?? 'Enter address'
    case CHAIN_NAMESPACE.CosmosSdk: {
      const cosmosSdk = COSMOS_SDK_VALIDATORS[chainReference]
      return cosmosSdk ? `${cosmosSdk.hrp}1...` : 'Enter address'
    }
    case CHAIN_NAMESPACE.Solana:
      return 'Enter Solana address'
    case CHAIN_NAMESPACE.Tron:
      return 'T...'
    case CHAIN_NAMESPACE.Ton:
      return 'UQ... or EQ...'
    case CHAIN_NAMESPACE.Sui:
    case CHAIN_NAMESPACE.Starknet:
      return '0x...'
    case CHAIN_NAMESPACE.Near:
      return 'name.near or 64 hex chars'
    default:
      return 'Enter address'
  }
}
