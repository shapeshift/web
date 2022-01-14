import { CAIP2 } from '@shapeshiftoss/caip'

import { AccountSpecifier } from './portfolioSlice'

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

// note - this isn't a selector, just a pure utility function
export const accountIdToLabel = (accountId: AccountSpecifier): string => {
  const chainId = accountIdToChainId(accountId)
  const specifier = accountIdToSpecifier(accountId)
  switch (chainId) {
    case ethChainId: {
      // this will be the 0x account
      return specifier
    }
    case btcChainId: {
      // TODO(0xdef1cafe): translations
      if (specifier.startsWith('xpub')) return 'Legacy'
      if (specifier.startsWith('ypub')) return 'Segwit'
      if (specifier.startsWith('zpub')) return 'Segwit Native'
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
