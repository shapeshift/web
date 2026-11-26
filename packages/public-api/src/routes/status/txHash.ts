import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'

const HEX_32 = /^(0x)?[0-9a-f]{64}$/i
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/
const BASE64_32 = /^[A-Za-z0-9+/_-]{43}=?$/

const digits = (hash: string): string => hash.replace(/^0x/i, '')

const chainNamespaceOf = (chainId: string): string | undefined => {
  try {
    return fromChainId(chainId).chainNamespace
  } catch {
    return
  }
}

// A sell transaction hash in the form its chain's tooling reports, or undefined when it can't be one. The
// canonical spelling keeps a retry with another case or prefix bound to the same transaction.
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
      return BASE58.test(hash) && hash.length >= 64 && hash.length <= 88 ? hash : undefined
    // a 32 byte digest in base58
    case CHAIN_NAMESPACE.Sui:
    case CHAIN_NAMESPACE.Near:
      return BASE58.test(hash) && hash.length >= 32 && hash.length <= 44 ? hash : undefined
    case CHAIN_NAMESPACE.Aptos:
      return HEX_32.test(hash) ? `0x${digits(hash).toLowerCase()}` : undefined
    // a field element, which explorers print without leading zeros
    case CHAIN_NAMESPACE.Starknet:
      return /^0x[0-9a-f]{1,64}$/i.test(hash) ? hash.toLowerCase() : undefined
    case CHAIN_NAMESPACE.Ton:
      if (HEX_32.test(hash)) return digits(hash).toLowerCase()
      return BASE64_32.test(hash) ? hash : undefined
    default:
      return
  }
}
