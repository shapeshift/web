import { base64ToHex } from '@shapeshiftoss/utils'
import { Address } from '@ton/core'

import { PROXY_TON_CONTRACTS, TON_HASH_HEX_LENGTH } from './constants'
import type { TonAddressBook, TonTx } from './types'

export const isHexHash = (str: string): boolean => {
  return str.length === TON_HASH_HEX_LENGTH && /^[0-9a-f]+$/i.test(str)
}

export const addressesMatch = (addr1: string, addr2: string): boolean => {
  if (!addr1 || !addr2) return false
  if (addr1 === addr2) return true
  try {
    return Address.parse(addr1).equals(Address.parse(addr2))
  } catch {
    const normalize = (a: string) => a.replace(/^0:/, '').toLowerCase()
    return normalize(addr1) === normalize(addr2)
  }
}

export const isProxyTon = (jettonMaster: string): boolean => {
  if (PROXY_TON_CONTRACTS.has(jettonMaster)) return true
  try {
    const parsed = Address.parse(jettonMaster)
    for (const known of PROXY_TON_CONTRACTS) {
      try {
        if (parsed.equals(Address.parse(known))) return true
      } catch {
        continue
      }
    }
  } catch {}
  return false
}

export const resolveAddresses = (tx: TonTx, addressBook: TonAddressBook): TonTx => {
  const resolve = (addr: string | undefined): string | undefined =>
    addr ? addressBook[addr]?.user_friendly ?? addr : addr

  return {
    ...tx,
    in_msg: tx.in_msg
      ? {
          ...tx.in_msg,
          source: resolve(tx.in_msg.source),
          destination: resolve(tx.in_msg.destination),
        }
      : tx.in_msg,
    out_msgs: tx.out_msgs?.map(msg => ({
      ...msg,
      source: resolve(msg.source),
      destination: resolve(msg.destination),
    })),
  }
}

// Externally-initiated txs are keyed by their message hash - the same id broadcast returns and
// parseTx uses, so rows upserted at swap time and history rows share one identity
export const getTraceOwnerTxid = (owner: TonTx): string => {
  const isExternalInitiated = !owner.in_msg?.source && Boolean(owner.in_msg?.hash)
  return base64ToHex(isExternalInitiated && owner.in_msg?.hash ? owner.in_msg.hash : owner.hash)
}

export const formatTonError = (error: string): string => {
  if (error.includes('INVALID_BAG_OF_CELLS')) {
    return `TON transaction serialization error: ${error}. This may indicate an invalid transaction format.`
  }
  if (error.includes('seqno')) {
    return `TON sequence number error: ${error}. The transaction may be stale or already processed.`
  }
  if (error.includes('not enough balance') || error.includes('insufficient')) {
    return `TON insufficient balance: ${error}`
  }
  return `TON RPC error: ${error}`
}

export const isRetryableError = (error: string): boolean => {
  const lowerError = error.toLowerCase()

  const nonRetryablePatterns = [
    'insufficient',
    'not enough balance',
    'invalid',
    'malformed',
    'unauthorized',
    'forbidden',
    'not found',
    'bad request',
    'seqno',
  ]
  if (nonRetryablePatterns.some(pattern => lowerError.includes(pattern))) {
    return false
  }

  const retryablePatterns = [
    'timeout',
    'etimedout',
    'econnreset',
    'econnrefused',
    'network',
    'temporarily unavailable',
    'rate limit',
    '429',
    '500',
    '502',
    '503',
  ]
  return retryablePatterns.some(pattern => lowerError.includes(pattern))
}
