import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  arbitrumNovaChainId,
  avalancheChainId,
  baseChainId,
  bchChainId,
  bscChainId,
  btcChainId,
  CHAIN_NAMESPACE,
  cosmosChainId,
  deserializeNftAssetReference,
  dogeChainId,
  ethChainId,
  fromAccountId,
  fromAssetId,
  fromChainId,
  gnosisChainId,
  isNft,
  ltcChainId,
  optimismChainId,
  polygonChainId,
  thorchainChainId,
  toAccountId,
  toAssetId,
} from '@shapeshiftoss/caip'
import type { Account } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import {
  supportsArbitrum,
  supportsArbitrumNova,
  supportsAvalanche,
  supportsBase,
  supportsBSC,
  supportsBTC,
  supportsCosmos,
  supportsETH,
  supportsGnosis,
  supportsOptimism,
  supportsPolygon,
  supportsThorchain,
} from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds, UtxoChainId } from '@shapeshiftoss/types'
import { bech32 } from 'bech32'
import cloneDeep from 'lodash/cloneDeep'
import maxBy from 'lodash/maxBy'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { assertUnreachable, firstFourLastFour } from 'lib/utils'
import { isSpammyNftText } from 'state/apis/nft/constants'
import type { NftCollectionType } from 'state/apis/nft/types'

import type {
  Portfolio,
  PortfolioAccountBalancesById,
  PortfolioAccounts as PortfolioSliceAccounts,
} from '../portfolioSliceCommon'
import { initialState } from '../portfolioSliceCommon'

// note - this isn't a selector, just a pure utility function
export const accountIdToLabel = (accountId: AccountId): string => {
  const { chainId, account: pubkey } = fromAccountId(accountId)
  switch (chainId) {
    case avalancheChainId:
    case optimismChainId:
    case ethChainId:
    case polygonChainId:
    case gnosisChainId:
    case bscChainId:
    case arbitrumChainId:
    case arbitrumNovaChainId:
    case baseChainId:
    case thorchainChainId:
    case cosmosChainId:
      return firstFourLastFour(pubkey)
    case btcChainId:
      // TODO(0xdef1cafe): translations
      if (pubkey.startsWith('xpub')) return 'Legacy'
      if (pubkey.startsWith('ypub')) return 'Segwit'
      if (pubkey.startsWith('zpub') || bech32.decode(pubkey).prefix === 'bc') return 'Segwit Native'
      return ''
    case bchChainId:
      return 'Bitcoin Cash'
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
  nftCollectionsById: Partial<Record<AssetId, NftCollectionType>>
}

type AccountToPortfolio = (args: AccountToPortfolioArgs) => Portfolio

// this should live in chain adapters but is here for backwards compatibility
// until we can kill all the other places in web fetching this data
export const accountToPortfolio: AccountToPortfolio = ({
  assetIds,
  nftCollectionsById,
  portfolioAccounts,
}) => {
  const portfolio: Portfolio = cloneDeep(initialState)

  Object.entries(portfolioAccounts).forEach(([_xpubOrAccount, account]) => {
    const { chainId } = account
    const { chainNamespace } = fromChainId(chainId)

    const hasActivity = checkAccountHasActivity(account)

    switch (chainNamespace) {
      case CHAIN_NAMESPACE.Evm: {
        const ethAccount = account as Account<KnownChainIds.EthereumMainnet>
        const { chainId, assetId, pubkey } = account
        const accountId = toAccountId({ chainId, account: pubkey })

        portfolio.accounts.ids.push(accountId)
        portfolio.accounts.byId[accountId] = { assetIds: [assetId], hasActivity }
        portfolio.accountBalances.ids.push(accountId)
        portfolio.accountBalances.byId[accountId] = { [assetId]: account.balance }

        ethAccount.chainSpecific.tokens?.forEach(token => {
          // don't update portfolio if asset is not in the store except for nft assets,
          // nft assets will be dynamically upserted based on the state of the txHistory slice after the portfolio is loaded
          if (!isNft(token.assetId) && !assetIds.includes(token.assetId)) return

          if (isNft(token.assetId)) {
            const { assetReference, chainId, assetNamespace } = fromAssetId(token.assetId)
            const [contractAddress] = deserializeNftAssetReference(assetReference)
            const collectionAssetId = toAssetId({
              chainId,
              assetReference: contractAddress,
              assetNamespace,
            })

            const nftCollection = nftCollectionsById[collectionAssetId]

            if (nftCollection) {
              if (nftCollection.isSpam) return
              if (
                [nftCollection.description, nftCollection.name].some(nftText =>
                  isSpammyNftText(nftText),
                )
              )
                return
            } else {
              if ([token.name, token.symbol].some(nftText => isSpammyNftText(nftText, true))) return
            }
          }

          if (bnOrZero(token.balance).gt(0)) portfolio.accounts.byId[accountId].hasActivity = true

          portfolio.accounts.byId[accountId].assetIds.push(token.assetId)
          portfolio.accountBalances.byId[accountId][token.assetId] = token.balance
        })

        break
      }
      case CHAIN_NAMESPACE.Utxo: {
        const { balance, chainId, assetId, pubkey } = account

        // Since btc the pubkeys (address) are base58Check encoded, we don't want to lowercase them and put them in state
        const accountId = `${chainId}:${pubkey}`

        portfolio.accounts.ids.push(accountId)
        portfolio.accounts.byId[accountId] = { assetIds: [assetId], hasActivity }
        portfolio.accountBalances.ids.push(accountId)
        portfolio.accountBalances.byId[accountId] = { [assetId]: balance }

        break
      }
      case CHAIN_NAMESPACE.CosmosSdk: {
        const cosmosAccount = account as Account<KnownChainIds.CosmosMainnet>
        const { chainId, assetId } = account
        const accountId = toAccountId({ chainId, account: _xpubOrAccount })

        portfolio.accounts.ids.push(accountId)
        portfolio.accounts.byId[accountId] = { assetIds: [assetId], hasActivity }
        portfolio.accountBalances.ids.push(accountId)
        portfolio.accountBalances.byId[accountId] = { [assetId]: account.balance }

        cosmosAccount.chainSpecific.assets?.forEach(asset => {
          if (!assetIds.includes(asset.assetId)) return

          if (bnOrZero(asset.amount).gt(0)) portfolio.accounts.byId[accountId].hasActivity = true

          portfolio.accounts.byId[accountId].assetIds.push(asset.assetId)
          portfolio.accountBalances.byId[accountId][asset.assetId] = asset.amount
        })

        break
      }
      default:
        assertUnreachable(chainNamespace)
    }
  })

  return portfolio
}

export const checkAccountHasActivity = (account: Account<ChainId>) => {
  const { chainId } = account
  const { chainNamespace } = fromChainId(chainId)

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.Evm: {
      const ethAccount = account as Account<KnownChainIds.EthereumMainnet>

      const hasActivity =
        bnOrZero(ethAccount.chainSpecific.nonce).gt(0) || bnOrZero(ethAccount.balance).gt(0)

      return hasActivity
    }
    case CHAIN_NAMESPACE.Utxo: {
      const utxoAccount = account as Account<UtxoChainId>
      const { balance } = account

      const hasActivity =
        bnOrZero(balance).gt(0) ||
        bnOrZero(utxoAccount.chainSpecific.nextChangeAddressIndex).gt(0) ||
        bnOrZero(utxoAccount.chainSpecific.nextReceiveAddressIndex).gt(0)

      return hasActivity
    }
    case CHAIN_NAMESPACE.CosmosSdk: {
      const cosmosAccount = account as Account<KnownChainIds.CosmosMainnet>

      const hasActivity =
        bnOrZero(cosmosAccount.chainSpecific.sequence).gt(0) ||
        bnOrZero(cosmosAccount.balance).gt(0)

      return hasActivity
    }
    default:
      assertUnreachable(chainNamespace)
  }
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
    case bscChainId:
      return supportsBSC(wallet)
    case polygonChainId:
      return supportsPolygon(wallet)
    case gnosisChainId:
      return supportsGnosis(wallet)
    case arbitrumChainId:
      return supportsArbitrum(wallet)
    case arbitrumNovaChainId:
      return supportsArbitrumNova(wallet)
    case baseChainId:
      return supportsBase(wallet)
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
    .toFixed()
}

export const getHighestUserCurrencyBalanceAccountByAssetId = (
  accountIdAssetValues: PortfolioAccountBalancesById,
  assetId?: AssetId,
): AccountId | undefined => {
  if (!assetId) return
  const accountValueMap = Object.entries(accountIdAssetValues).reduce((acc, [k, v]) => {
    const assetValue = v[assetId]
    return assetValue ? acc.set(k, assetValue) : acc
  }, new Map<AccountId, string>())
  const highestBalanceAccountToAmount = maxBy([...accountValueMap], ([_, v]) =>
    bnOrZero(v).toNumber(),
  )
  return highestBalanceAccountToAmount?.[0]
}

export const getFirstAccountIdByChainId = (
  accountIds: AccountId[],
  chainId: ChainId,
): AccountId | undefined =>
  accountIds.filter(accountId => fromAccountId(accountId).chainId === chainId)[0]

export const haveSameElements = <T>(arr1: T[], arr2: T[]) => {
  if (arr1.length !== arr2.length) {
    return false
  }

  const sortedArr1 = [...arr1].sort()
  const sortedArr2 = [...arr2].sort()

  return sortedArr1.every((el1, i) => el1 === sortedArr2[i])
}
