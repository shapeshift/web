import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import bs58 from 'bs58'

const HEX_32 = /^(0x)?[0-9a-f]{64}$/i
const BASE64_32 = /^[A-Za-z0-9+/_-]{43}=?$/

// 2^251 + 17 * 2^192 + 1, every Starknet field element is below it
const STARKNET_FIELD_PRIME = 2n ** 251n + 17n * 2n ** 192n + 1n

const digits = (hash: string): string => hash.replace(/^0x/i, '')

const chainNamespaceOf = (chainId: string): string | undefined => {
  try {
    return fromChainId(chainId).chainNamespace
  } catch {
    return
  }
}

// base58 maps bytes one to one, so a string that decodes to the right length is already canonical
const base58OfLength = (hash: string, byteLength: number): string | undefined =>
  bs58.decodeUnsafe(hash)?.length === byteLength ? hash : undefined

const normalizeStarknetHash = (hash: string): string | undefined => {
  if (!/^0x[0-9a-f]{1,64}$/i.test(hash)) return
  const value = BigInt(hash)
  return value < STARKNET_FIELD_PRIME ? `0x${value.toString(16)}` : undefined
}

// TON tooling reports the same 32 byte hash in hex, base64 or base64url, the adapter broadcasts hex
const normalizeTonHash = (hash: string): string | undefined => {
  if (HEX_32.test(hash)) return digits(hash).toLowerCase()
  if (!BASE64_32.test(hash)) return
  const bytes = Buffer.from(hash.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
  return bytes.length === 32 ? bytes.toString('hex') : undefined
}

// A sell transaction hash in the form its chain's tooling reports, or undefined when it can't be one. The
// canonical spelling keeps a retry with another case, prefix or encoding bound to the same transaction.
export const normalizeTxHash = (chainId: string, txHash: string): string | undefined => {
  const hash = txHash.trim()

  switch (chainNamespaceOf(chainId)) {
    case CHAIN_NAMESPACE.Evm:
      return HEX_32.test(hash) ? `0x${digits(hash).toLowerCase()}` : undefined
    case CHAIN_NAMESPACE.Utxo:
    case CHAIN_NAMESPACE.Tron:
      return HEX_32.test(hash) ? digits(hash).toLowerCase() : undefined
    case CHAIN_NAMESPACE.CosmosSdk:
      return HEX_32.test(hash) ? digits(hash).toUpperCase() : undefined
    // a 64 byte signature in base58
    case CHAIN_NAMESPACE.Solana:
      return base58OfLength(hash, 64)
    // a 32 byte digest in base58
    case CHAIN_NAMESPACE.Sui:
    case CHAIN_NAMESPACE.Near:
      return base58OfLength(hash, 32)
    case CHAIN_NAMESPACE.Aptos:
      return HEX_32.test(hash) ? `0x${digits(hash).toLowerCase()}` : undefined
    // a field element, which explorers and nodes print without leading zeros
    case CHAIN_NAMESPACE.Starknet:
      return normalizeStarknetHash(hash)
    case CHAIN_NAMESPACE.Ton:
      return normalizeTonHash(hash)
    default:
      return
  }
}
