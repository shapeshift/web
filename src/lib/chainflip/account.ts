import { blake2b } from 'blakejs'
import bs58 from 'bs58'
import { hexToBytes, isHex } from 'viem'

import { CHAINFLIP_SS58_PREFIX } from './constants'
import { cfAccountInfoV2, cfFreeBalances } from './rpc'
import type { ChainflipAccountInfo, ChainflipFreeBalancesResponse } from './types'

import { bnOrZero } from '@/lib/bignumber/bignumber'

const SS58_PREFIX_BYTES = new TextEncoder().encode('SS58PRE')

const encodeSs58Prefix = (prefix: number): Uint8Array => {
  if (prefix < 0 || prefix > 16_383) {
    throw new Error('Invalid SS58 prefix')
  }

  if (prefix < 64) {
    return Uint8Array.from([prefix])
  }

  const first = ((prefix & 0b1111_1100) >> 2) | 0b0100_0000
  const second = (prefix >> 8) | ((prefix & 0b0000_0011) << 6)

  return Uint8Array.from([first, second])
}

const ss58Encode = (payload: Uint8Array, prefix: number): string => {
  const prefixBytes = encodeSs58Prefix(prefix)
  const data = new Uint8Array(prefixBytes.length + payload.length)
  data.set(prefixBytes)
  data.set(payload, prefixBytes.length)

  const checksumInput = new Uint8Array(SS58_PREFIX_BYTES.length + data.length)
  checksumInput.set(SS58_PREFIX_BYTES)
  checksumInput.set(data, SS58_PREFIX_BYTES.length)

  const checksum = blake2b(checksumInput, undefined, 64).subarray(0, 2)
  const result = new Uint8Array(data.length + checksum.length)
  result.set(data)
  result.set(checksum, data.length)

  return bs58.encode(result)
}

export const ethAddressToScAccount = (ethAddress: string): string => {
  if (!isHex(ethAddress)) {
    throw new Error('Invalid Ethereum address')
  }

  const addressBytes = hexToBytes(ethAddress)
  if (addressBytes.length !== 20) {
    throw new Error('Invalid Ethereum address length')
  }

  const padded = new Uint8Array(32)
  padded.set(addressBytes, 32 - addressBytes.length)

  return ss58Encode(padded, CHAINFLIP_SS58_PREFIX)
}

export const isAccountFunded = (freeBalances: ChainflipFreeBalancesResponse): boolean => {
  return freeBalances.some(balance => bnOrZero(balance.balance).gt(0))
}

export type ChainflipAccountStatus = {
  scAccountId: string
  freeBalances: ChainflipFreeBalancesResponse
  accountInfo: ChainflipAccountInfo
  isFunded: boolean
}

export const getChainflipAccountStatus = async (
  ethAddress: string,
): Promise<ChainflipAccountStatus> => {
  const scAccountId = ethAddressToScAccount(ethAddress)
  const [freeBalances, accountInfo] = await Promise.all([
    cfFreeBalances(scAccountId),
    cfAccountInfoV2(scAccountId),
  ])

  return {
    scAccountId,
    freeBalances,
    accountInfo,
    isFunded: isAccountFunded(freeBalances),
  }
}
