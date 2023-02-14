import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  accountIdToChainId,
  avalancheChainId,
  bchChainId,
  btcChainId,
  CHAIN_NAMESPACE,
  cosmosChainId,
  dogeChainId,
  ethChainId,
  fromAccountId,
  fromAssetId,
  fromChainId,
  ltcChainId,
  optimismChainId,
  osmosisChainId,
  thorchainChainId,
  toAccountId,
} from '@shapeshiftoss/caip'
import type { Account } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import {
  supportsAvalanche,
  supportsBTC,
  supportsCosmos,
  supportsETH,
  supportsOptimism,
  supportsThorchain,
} from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
import cloneDeep from 'lodash/cloneDeep'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'

import type {
  Portfolio,
  PortfolioAccountBalancesById,
  PortfolioAccounts as PortfolioSliceAccounts,
} from './portfolioSliceCommon'
import { initialState } from './portfolioSliceCommon'

export const firstFourLastFour = (address: string): string =>
  `${address.slice(0, 6)}...${address.slice(-4)}`

export const trimWithEndEllipsis = (content?: string, trimmedContentLength?: number): string => {
  if (!content) return ''

  if (!trimmedContentLength) return content

  if (content.length < trimmedContentLength) return content

  return content.slice(0, trimmedContentLength).concat('...')
}

// note - this isn't a selector, just a pure utility function
export const accountIdToLabel = (accountId: AccountId): string => {
  const { chainId, account: pubkey } = fromAccountId(accountId)
  switch (chainId) {
    case avalancheChainId:
    case optimismChainId:
    case ethChainId:
      // this will be the 0x account
      return firstFourLastFour(pubkey)
    case btcChainId:
      // TODO(0xdef1cafe): translations
      if (pubkey.startsWith('xpub')) return 'Legacy'
      if (pubkey.startsWith('ypub')) return 'Segwit'
      if (pubkey.startsWith('zpub')) return 'Segwit Native'
      return ''
    case bchChainId:
      return 'Bitcoin Cash'
    case cosmosChainId:
      return 'Cosmos'
    case osmosisChainId:
      return 'Osmosis'
    case thorchainChainId:
      return 'Thorchain'
    case dogeChainId:
      return 'Dogecoin'
    case ltcChainId:
      // TODO: translations
      if (pubkey.startsWith('Ltub')) return 'Legacy'
      if (pubkey.startsWith('Mtub')) return 'Segwit'
      if (pubkey.startsWith('zpub')) return 'Segwit Native'
      return ''
    default: {
      return ''
    }
  }
}

export const isUtxoAccountId = (accountId: AccountId): boolean =>
  fromAccountId(accountId).chainNamespace === CHAIN_NAMESPACE.Utxo

export const isUtxoChainId = (chainId: ChainId): boolean =>
  fromChainId(chainId).chainNamespace === CHAIN_NAMESPACE.Utxo

export const accountIdToFeeAssetId = (accountId: AccountId): AssetId | undefined =>
  getChainAdapterManager().get(accountIdToChainId(accountId))?.getFeeAssetId()

export const chainIdToFeeAssetId = (chainId: ChainId): AssetId | undefined =>
  getChainAdapterManager().get(chainId)?.getFeeAssetId()

export const assetIdToFeeAssetId = (assetId: AssetId): AssetId | undefined =>
  chainIdToFeeAssetId(fromAssetId(assetId).chainId)

export const findAccountsByAssetId = (
  portfolioAccounts: PortfolioSliceAccounts['byId'],
  assetId?: AssetId,
): AccountId[] => {
  if (!assetId) return []
  const result = Object.entries(portfolioAccounts).reduce<AccountId[]>(
    (acc, [accountId, account]) => {
      if (account.assetIds.includes(assetId)) acc.push(accountId)
      return acc
    },
    [],
  )

  // If we don't find an account that has the given asset,
  // return the account(s) for that given assets chain
  if (result.length === 0 && assetId) {
    return Object.keys(portfolioAccounts).filter(
      accountId => fromAssetId(assetId).chainId === fromAccountId(accountId).chainId,
    )
  }
  return result
}

type PortfolioAccounts = {
  [k: AccountId]: Account<ChainId>
}

type AccountToPortfolioArgs = {
  portfolioAccounts: PortfolioAccounts
  assetIds: string[]
}

type AccountToPortfolio = (args: AccountToPortfolioArgs) => Portfolio

// this should live in chain adapters but is here for backwards compatibility
// until we can kill all the other places in web fetching this data
export const accountToPortfolio: AccountToPortfolio = args => {
  const portfolio: Portfolio = cloneDeep(initialState)

  Object.entries(args.portfolioAccounts).forEach(([_xpubOrAccount, account]) => {
    const { chainId } = account
    const { chainNamespace } = fromChainId(chainId)

    switch (chainNamespace) {
      case CHAIN_NAMESPACE.Evm: {
        const ethAccount = account as Account<KnownChainIds.EthereumMainnet>
        const { chainId, assetId, pubkey } = account
        const accountId = toAccountId({ chainId, account: pubkey })
        portfolio.accountBalances.ids.push(accountId)

        portfolio.accounts.byId[accountId] = { assetIds: [] }
        portfolio.accounts.byId[accountId].assetIds.push(assetId)
        portfolio.accounts.ids.push(accountId)

        portfolio.accountBalances.byId[accountId] = {
          [assetId]: ethAccount.balance,
        }

        ethAccount.chainSpecific.tokens?.forEach(token => {
          if (!args.assetIds.includes(token.assetId)) {
            return
          }

          portfolio.accounts.byId[accountId].assetIds.push(token.assetId)

          portfolio.accountBalances.byId[accountId] = {
            ...portfolio.accountBalances.byId[accountId],
            [token.assetId]: token.balance,
          }
        })
        break
      }
      case CHAIN_NAMESPACE.Utxo: {
        const { balance, chainId, assetId, pubkey } = account
        // Since btc the pubkeys (address) are base58Check encoded, we don't want to lowercase them and put them in state
        const accountId = `${chainId}:${pubkey}`

        portfolio.accountBalances.ids.push(accountId)

        // initialize this
        portfolio.accountBalances.byId[accountId] = {}

        // add the balance from the top level of the account
        portfolio.accountBalances.byId[accountId][assetId] = balance

        // initialize
        if (!portfolio.accounts.byId[accountId]?.assetIds.length) {
          portfolio.accounts.byId[accountId] = {
            assetIds: [],
          }
        }

        portfolio.accounts.ids = Array.from(new Set([...portfolio.accounts.ids, accountId]))

        portfolio.accounts.byId[accountId].assetIds = Array.from(
          new Set([...portfolio.accounts.byId[accountId].assetIds, assetId]),
        )

        break
      }
      case CHAIN_NAMESPACE.CosmosSdk: {
        const cosmosAccount = account as Account<KnownChainIds.CosmosMainnet>
        const { chainId, assetId } = account
        const accountId = toAccountId({ chainId, account: _xpubOrAccount })
        portfolio.accountBalances.ids.push(accountId)

        portfolio.accounts.byId[accountId] = {
          assetIds: [],
        }

        portfolio.accounts.byId[accountId].assetIds.push(assetId)

        portfolio.accounts.ids.push(accountId)

        cosmosAccount.chainSpecific.assets?.forEach(asset => {
          if (!args.assetIds.includes(asset.assetId)) {
            return
          }
          portfolio.accounts.byId[accountId].assetIds.push(asset.assetId)

          portfolio.accountBalances.byId[accountId] = {
            ...portfolio.accountBalances.byId[accountId],
            [asset.assetId]: asset.amount,
          }
        })
        portfolio.accountBalances.byId[accountId] = {
          ...portfolio.accountBalances.byId[accountId],
          [assetId]: account.balance,
        }

        break
      }
      default:
        break
    }
  })

  return portfolio
}

export const isAssetSupportedByWallet = (assetId: AssetId, wallet: HDWallet): boolean => {
  if (!assetId) return false
  const { chainId } = fromAssetId(assetId)
  switch (chainId) {
    case ethChainId:
      return supportsETH(wallet)
    case avalancheChainId:
      return supportsAvalanche(wallet)
    case optimismChainId:
      return supportsOptimism(wallet)
    case btcChainId:
    case ltcChainId:
    case dogeChainId:
    case bchChainId:
      return supportsBTC(wallet)
    case cosmosChainId:
      return supportsCosmos(wallet)
    case thorchainChainId:
      return supportsThorchain(wallet)
    default:
      return false
  }
}

export const genericBalanceIncludingStakingByFilter = (
  accountBalances: PortfolioAccountBalancesById,
  assetId: AssetId | undefined,
  accountId: AccountId | undefined,
): string => {
  const totalByAccountId = Object.entries(accountBalances)
    .filter(([acctId]) => (accountId ? acctId === accountId : true)) // if no accountId filter, return all
    .reduce<Record<AccountId, BigNumber>>((acc, [accountId, byAssetId]) => {
      const accountTotal = Object.entries(byAssetId)
        .filter(([id, _assetBalance]) => (assetId ? id === assetId : true)) // if no assetId filter, return all
        .reduce((innerAcc, [_id, assetBalance]) => innerAcc.plus(bnOrZero(assetBalance)), bn(0))
      acc[accountId] = accountTotal
      return acc
    }, {})
  return Object.values(totalByAccountId)
    .reduce((acc, accountBalance) => acc.plus(accountBalance), bn(0))
    .toString()
}
