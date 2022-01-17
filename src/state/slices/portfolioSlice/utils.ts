import { CAIP2 } from '@shapeshiftoss/caip'
import { utxoAccountParams } from '@shapeshiftoss/chain-adapters'
import { BTCInputScriptType } from '@shapeshiftoss/hdwallet-core'
import { Asset, BIP44Params, UtxoAccountType } from '@shapeshiftoss/types'
import last from 'lodash/last'

import { AccountSpecifier } from './portfolioSlice'

export type UtxoParamsAndAccountType = {
  utxoParams: { scriptType: BTCInputScriptType; bip44Params: BIP44Params }
  accountType: UtxoAccountType
}

// TODO(0xdef1cafe): these should be exported from caip2
export const ethChainId = 'eip155:1'
export const btcChainId = 'bip122:000000000019d6689c085ae165831e93'

// we only need to update this when we support additional chains, which is infrequent
// so it's ok to hardcode this map here
const caip2toCaip19: Record<string, string> = {
  [ethChainId]: 'eip155:1/slip44:60',
  [btcChainId]: 'bip122:000000000019d6689c085ae165831e93/slip44:0'
}

export const accountIdToChainId = (accountId: AccountSpecifier): CAIP2 => {
  // accountId = 'eip155:1:0xdef1...cafe
  const [chain, network] = accountId.split(':')
  return `${chain}:${network}`
}

export const accountIdToSpecifier = (accountId: AccountSpecifier): string => {
  // in the case of account based chains (eth), this is an address
  // in the case of utxo based chains, this is an x/y/zpub
  return accountId.split(':')[2] ?? ''
}

export const firstFourLastFour = (address: string): string =>
  `${address.slice(0, 6)}...${address.slice(-4)}`

// note - this isn't a selector, just a pure utility function
export const accountIdToLabel = (accountId: AccountSpecifier): string => {
  /*
   * 0xdef1cafe note - this is not purely technically correct as per specs,
   * i.e. it's entirely possible to use segwit native with an xpub
   *
   * however, in our *current* context, this assumption is valid:
   * the account specifier, e.g. xpub/ypub/zpub/0xaddress we use with unchained
   * will return legacy/segwit/segwit native addresses and balances respectively
   *
   * we absolutely should consider storing more semantically correct account
   * data in the store - a combination of script type and bip44 params,
   * with mappings in both directions so information is not lost, e.g.
   * we can recover script type and bip44 params from an address or xpub,
   * but this is a bigger discussion to have.
   *
   * for now, for all intents and purposes, this is sufficient and works.
   *
   */
  const chainId = accountIdToChainId(accountId)
  const specifier = accountIdToSpecifier(accountId)
  switch (chainId) {
    case ethChainId: {
      // this will be the 0x account
      return firstFourLastFour(specifier)
    }
    case btcChainId: {
      // TODO(0xdef1cafe): translations
      if (specifier.startsWith('xpub')) return 'LEGACY'
      if (specifier.startsWith('ypub')) return 'SEGWIT'
      if (specifier.startsWith('zpub')) return 'SEGWIT NATIVE'
      return ''
    }
    default: {
      return ''
    }
  }
}

// note - this is not really a selector, more of a util
export const accountIdToFeeAssetId = (accountId: AccountSpecifier) =>
  caip2toCaip19[accountIdToChainId(accountId)]

export const accountIdToAccountType = (accountId: AccountSpecifier): UtxoAccountType | null => {
  const pubkeyVariant = last(accountId.split(':'))
  if (pubkeyVariant?.startsWith('xpub')) return UtxoAccountType.P2pkh
  if (pubkeyVariant?.startsWith('ypub')) return UtxoAccountType.SegwitP2sh
  if (pubkeyVariant?.startsWith('zpub')) return UtxoAccountType.SegwitNative
  return null
}

export const accountIdToUtxoParams = (
  asset: Asset,
  accountId: AccountSpecifier,
  accountIndex: number
) => {
  const accountType = accountIdToAccountType(accountId)
  // for eth, we don't return a UtxoAccountType or utxoParams
  if (!accountType) return {}
  const utxoParams = utxoAccountParams(asset, accountType, accountIndex)
  return { utxoParams, accountType }
}
