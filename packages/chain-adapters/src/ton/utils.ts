import { Address } from '@ton/core'

import { PROXY_TON_CONTRACTS, TON_HASH_HEX_LENGTH } from './constants'
import type { TonTx } from './types'

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

export const resolveAddresses = (
  tx: TonTx,
  addressBook: Record<string, { user_friendly: string }>,
): TonTx => {
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
