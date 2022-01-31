import { CAIP2, CAIP10, caip10, CAIP19 } from '@shapeshiftoss/caip'
import { utxoAccountParams } from '@shapeshiftoss/chain-adapters'
import { BTCInputScriptType } from '@shapeshiftoss/hdwallet-core'
import {
  Asset,
  BIP44Params,
  chainAdapters,
  ChainTypes,
  UtxoAccountType
} from '@shapeshiftoss/types'
import cloneDeep from 'lodash/cloneDeep'
import last from 'lodash/last'
import toLower from 'lodash/toLower'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'

import { AccountSpecifier, initialState, Portfolio } from './portfolioSlice'

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

export const assetIdtoChainId = (caip19: CAIP19): string => {
  return caip19.split('/')[0]
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

export const findAccountsByAssetId = (
  portfolioAccounts: { [k: string]: string[] },
  assetId: CAIP19
): AccountSpecifier[] => {
  const result = Object.entries(portfolioAccounts).reduce<AccountSpecifier[]>(
    (acc, [accountId, accountAssets]) => {
      if (accountAssets.includes(assetId)) acc.push(accountId)
      return acc
    },
    []
  )

  // If we don't find an account that has the given asset,
  // return the account(s) for that given assets chain
  if (result.length === 0) {
    return Object.keys(portfolioAccounts).filter(
      accountId => assetIdtoChainId(assetId) === accountIdToChainId(accountId)
    )
  }
  return result
}

type PortfolioAccounts = {
  [k: CAIP10]: chainAdapters.Account<ChainTypes>
}

type AccountToPortfolioArgs = {
  portfolioAccounts: PortfolioAccounts
  assetIds: string[]
}

type AccountToPortfolio = (args: AccountToPortfolioArgs) => Portfolio

const sumBalance = (totalBalance: string, currentBalance: string) => {
  return bnOrZero(bn(totalBalance).plus(bn(currentBalance))).toString()
}

// this should live in chain adapters but is here for backwards compatibility
// until we can kill all the other places in web fetching this data
export const accountToPortfolio: AccountToPortfolio = args => {
  const portfolio: Portfolio = cloneDeep(initialState)

  Object.entries(args.portfolioAccounts).forEach(([_xpubOrAccount, account]) => {
    const { chain } = account

    switch (chain) {
      case ChainTypes.Ethereum: {
        const ethAccount = account as chainAdapters.Account<ChainTypes.Ethereum>
        const { caip2, caip19, pubkey } = account
        const accountSpecifier = `${caip2}:${toLower(pubkey)}`
        const CAIP10 = caip10.toCAIP10({ caip2, account: _xpubOrAccount })
        portfolio.accountBalances.ids.push(accountSpecifier)
        portfolio.accountSpecifiers.ids.push(accountSpecifier)

        portfolio.accounts.byId[accountSpecifier] = []
        portfolio.accounts.byId[accountSpecifier].push(caip19)
        portfolio.accounts.ids.push(accountSpecifier)

        portfolio.assetBalances.byId[caip19] = sumBalance(
          portfolio.assetBalances.byId[caip19] ?? '0',
          ethAccount.balance
        )

        // add assetId without dupes
        portfolio.assetBalances.ids = Array.from(new Set([...portfolio.assetBalances.ids, caip19]))

        portfolio.accountBalances.byId[accountSpecifier] = {
          [caip19]: ethAccount.balance
        }

        portfolio.accountSpecifiers.byId[accountSpecifier] = [CAIP10]

        ethAccount.chainSpecific.tokens?.forEach(token => {
          if (!args.assetIds.includes(token.caip19)) {
            return
          }

          portfolio.accounts.byId[CAIP10].push(token.caip19)
          // add assetId without dupes
          portfolio.assetBalances.ids = Array.from(
            new Set([...portfolio.assetBalances.ids, token.caip19])
          )

          // if token already exist inside assetBalances, add balance to existing balance
          portfolio.assetBalances.byId[token.caip19] = sumBalance(
            portfolio.assetBalances.byId[token.caip19] ?? '0',
            token.balance
          )

          portfolio.accountBalances.byId[accountSpecifier] = {
            ...portfolio.accountBalances.byId[accountSpecifier],
            [token.caip19]: token.balance
          }
        })
        break
      }
      case ChainTypes.Bitcoin: {
        const btcAccount = account as chainAdapters.Account<ChainTypes.Bitcoin>
        const { balance, caip2, caip19, pubkey } = account
        // Since btc the pubkeys (address) are base58Check encoded, we don't want to lowercase them and put them in state
        const accountSpecifier = `${caip2}:${pubkey}`
        const addresses = btcAccount.chainSpecific.addresses ?? []

        portfolio.assetBalances.ids.push(caip19)
        portfolio.accountBalances.ids.push(accountSpecifier)
        portfolio.accountSpecifiers.ids.push(accountSpecifier)

        // initialize this
        portfolio.accountBalances.byId[accountSpecifier] = {}

        // add the balance from the top level of the account
        portfolio.accountBalances.byId[accountSpecifier][caip19] = balance

        // initialize
        if (!portfolio.accounts.byId[accountSpecifier]?.length) {
          portfolio.accounts.byId[accountSpecifier] = []
        }

        portfolio.accounts.ids = Array.from(new Set([...portfolio.accounts.ids, accountSpecifier]))

        portfolio.accounts.byId[accountSpecifier] = Array.from(
          new Set([...portfolio.accounts.byId[accountSpecifier], caip19])
        )

        portfolio.assetBalances.ids = Array.from(new Set([...portfolio.assetBalances.ids, caip19]))

        portfolio.assetBalances.byId[caip19] = bnOrZero(portfolio.assetBalances.byId[caip19])
          .plus(bnOrZero(balance))
          .toString()

        // For tx history, we need to have CAIP10's of addresses that may have 0 balances
        // for accountSpecifier to CAIP10 mapping
        addresses.forEach(({ pubkey }) => {
          const CAIP10 = caip10.toCAIP10({ caip2, account: pubkey })
          if (!portfolio.accountSpecifiers.byId[accountSpecifier]) {
            portfolio.accountSpecifiers.byId[accountSpecifier] = []
          }

          portfolio.accountSpecifiers.byId[accountSpecifier].push(CAIP10)
        })

        break
      }
      default:
        break
    }
  })

  return portfolio
}
