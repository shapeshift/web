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
  osmosisChainId,
  thorchainChainId,
  toAccountId,
} from '@shapeshiftoss/caip'
import type { Account } from '@shapeshiftoss/chain-adapters'
import { utxoAccountParams } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import {
  supportsAvalanche,
  supportsBTC,
  supportsCosmos,
  supportsETH,
  supportsThorchain,
} from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { UtxoAccountType } from '@shapeshiftoss/types'
import cloneDeep from 'lodash/cloneDeep'
import groupBy from 'lodash/groupBy'
import last from 'lodash/last'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { isSome } from 'lib/utils'

import type { PubKey } from '../validatorDataSlice/validatorDataSlice'
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

export const accountIdToAccountType = (accountId: AccountId): UtxoAccountType | null => {
  const pubkeyVariant = last(accountId.split(':'))
  if (pubkeyVariant?.startsWith('xpub')) return UtxoAccountType.P2pkh
  if (pubkeyVariant?.startsWith('ypub')) return UtxoAccountType.SegwitP2sh
  if (pubkeyVariant?.startsWith('zpub')) return UtxoAccountType.SegwitNative
  if (pubkeyVariant?.startsWith('dgub')) return UtxoAccountType.P2pkh // doge
  if (pubkeyVariant?.startsWith('Ltub')) return UtxoAccountType.P2pkh // ltc
  if (pubkeyVariant?.startsWith('Mtub')) return UtxoAccountType.SegwitP2sh // ltc
  return null
}

export const accountIdToUtxoParams = (accountId: AccountId, accountIndex: number) => {
  const accountType = accountIdToAccountType(accountId)
  const chainId = fromAccountId(accountId).chainId
  // for eth, we don't return a UtxoAccountType or utxoParams
  if (!accountType) return {}
  const utxoParams = utxoAccountParams(chainId, accountType, accountIndex)
  return { utxoParams, accountType }
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
          validatorIds: [],
          stakingDataByValidatorId: {},
        }

        portfolio.accounts.byId[accountId].assetIds.push(assetId)
        const uniqueValidatorAddresses: PubKey[] = Array.from(
          new Set(
            [
              cosmosAccount.chainSpecific.delegations.map(
                delegation => delegation.validator.address,
              ),
              cosmosAccount.chainSpecific.undelegations
                .map(undelegation => {
                  return undelegation?.validator?.address
                })
                .filter(isSome),
              cosmosAccount.chainSpecific.rewards.map(reward => reward.validator.address),
            ].flat(),
          ),
        )

        portfolio.accounts.byId[accountId].validatorIds = uniqueValidatorAddresses
        portfolio.accounts.byId[accountId].stakingDataByValidatorId = {}

        // This block loads staking data at validator into the portfolio state
        // This is only ran once on portfolio load and after caching ends so the addditional time complexity isn't so relevant, but it can probably be simplified
        uniqueValidatorAddresses.forEach(validatorAddress => {
          const validatorRewards = cosmosAccount.chainSpecific.rewards.find(
            validatorRewards => validatorRewards.validator.address === validatorAddress,
          )
          const rewards = groupBy(validatorRewards?.rewards, rewardEntry => rewardEntry.assetId)
          // TODO: Do we need this? There might only be one entry per validator address actually
          const delegationEntries = cosmosAccount.chainSpecific.delegations.filter(
            delegation => delegation.validator.address === validatorAddress,
          )
          // TODO: Do we need this? There might only be one entry per validator address actually
          const undelegationEntries = cosmosAccount.chainSpecific.undelegations.find(
            undelegation => undelegation.validator.address === validatorAddress,
          )
          const delegations = groupBy(delegationEntries, delegationEntry => delegationEntry.assetId)
          const undelegations = groupBy(
            undelegationEntries?.entries,
            undelegationEntry => undelegationEntry.assetId,
          )

          const uniqueAssetIds = Array.from(
            new Set([
              ...Object.keys(delegations),
              ...Object.keys(undelegations),
              ...Object.keys(rewards),
            ]),
          )

          let portfolioAccount = portfolio.accounts.byId[accountId]
          if (portfolioAccount.stakingDataByValidatorId) {
            portfolioAccount.stakingDataByValidatorId[validatorAddress] = {}

            uniqueAssetIds.forEach(assetId => {
              // Useless check just to make TS happy, we are sure this is defined because of the assignment before the forEach
              // However, forEach being its own scope loses the narrowing
              if (portfolioAccount?.stakingDataByValidatorId?.[validatorAddress]) {
                portfolioAccount.stakingDataByValidatorId[validatorAddress][assetId] = {
                  delegations: delegations[assetId] ?? [],
                  undelegations: undelegations[assetId] ?? [],
                  rewards: rewards[assetId] ?? [],
                  redelegations: [], // We don't need redelegations in web, let's not store them in store but keep them for unchained/chain-adapters parity
                }
              }
            })
          }
        })

        portfolio.accounts.ids.push(accountId)

        portfolio.accountBalances.byId[accountId] = {
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
    case avalancheChainId:
      return supportsAvalanche(wallet)
    case ethChainId:
      return supportsETH(wallet)
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
