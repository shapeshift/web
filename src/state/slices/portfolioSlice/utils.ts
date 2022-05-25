import {
  AccountId,
  AssetId,
  btcChainId,
  ChainId,
  chainIdToFeeAssetId,
  cosmosChainId,
  ethChainId,
  fromAssetId,
  osmosisChainId,
  toAccountId,
  toChainId,
} from '@shapeshiftoss/caip'
import { utxoAccountParams } from '@shapeshiftoss/chain-adapters'
import { HDWallet, supportsBTC, supportsCosmos, supportsETH } from '@shapeshiftoss/hdwallet-core'
import { Asset, chainAdapters, ChainTypes, UtxoAccountType } from '@shapeshiftoss/types'
import cloneDeep from 'lodash/cloneDeep'
import groupBy from 'lodash/groupBy'
import last from 'lodash/last'
import toLower from 'lodash/toLower'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'

import { AccountSpecifier } from '../accountSpecifiersSlice/accountSpecifiersSlice'
import { PubKey } from '../validatorDataSlice/validatorDataSlice'
import {
  initialState,
  Portfolio,
  PortfolioAccounts as PortfolioSliceAccounts,
} from './portfolioSliceCommon'

export const chainIds = [ethChainId, btcChainId, cosmosChainId, osmosisChainId] as const
export type ChainIdType = typeof chainIds[number]

export const assetIdToChainId = (assetId: AssetId): ChainIdType =>
  assetId.split('/')[0] as ChainIdType

export const accountIdToChainId = (accountId: AccountSpecifier): ChainId => {
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
    case cosmosChainId: {
      return 'Cosmos'
    }
    case osmosisChainId: {
      return 'Osmosis'
    }
    default: {
      return ''
    }
  }
}

// note - this is not really a selector, more of a util
export const accountIdToFeeAssetId = (accountId: AccountSpecifier): AssetId =>
  chainIdToFeeAssetId(accountIdToChainId(accountId))

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
  accountIndex: number,
) => {
  const accountType = accountIdToAccountType(accountId)
  // for eth, we don't return a UtxoAccountType or utxoParams
  if (!accountType) return {}
  const utxoParams = utxoAccountParams(asset, accountType, accountIndex)
  return { utxoParams, accountType }
}

export const findAccountsByAssetId = (
  portfolioAccounts: PortfolioSliceAccounts['byId'],
  assetId: AssetId,
): AccountSpecifier[] => {
  const result = Object.entries(portfolioAccounts).reduce<AccountSpecifier[]>(
    (acc, [accountId, account]) => {
      if (account.assetIds.includes(assetId)) acc.push(accountId)
      return acc
    },
    [],
  )

  // If we don't find an account that has the given asset,
  // return the account(s) for that given assets chain
  if (result.length === 0) {
    return Object.keys(portfolioAccounts).filter(
      accountId => assetIdToChainId(assetId) === accountIdToChainId(accountId),
    )
  }
  return result
}

type PortfolioAccounts = {
  [k: AccountId]: chainAdapters.Account<ChainTypes>
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
      // TODO: Handle Cosmos ChainType here
      case ChainTypes.Ethereum: {
        const ethAccount = account as chainAdapters.Account<ChainTypes.Ethereum>
        const { chainId, assetId, pubkey } = account
        const accountSpecifier = `${chainId}:${toLower(pubkey)}`
        const accountId = toAccountId({ chainId, account: _xpubOrAccount })
        portfolio.accountBalances.ids.push(accountSpecifier)
        portfolio.accountSpecifiers.ids.push(accountSpecifier)

        portfolio.accounts.byId[accountSpecifier] = { assetIds: [] }
        portfolio.accounts.byId[accountSpecifier].assetIds.push(assetId)
        portfolio.accounts.ids.push(accountSpecifier)

        portfolio.assetBalances.byId[assetId] = sumBalance(
          portfolio.assetBalances.byId[assetId] ?? '0',
          ethAccount.balance,
        )

        // add assetId without dupes
        portfolio.assetBalances.ids = Array.from(new Set([...portfolio.assetBalances.ids, assetId]))

        portfolio.accountBalances.byId[accountSpecifier] = {
          [assetId]: ethAccount.balance,
        }

        portfolio.accountSpecifiers.byId[accountSpecifier] = [accountId]

        ethAccount.chainSpecific.tokens?.forEach(token => {
          if (!args.assetIds.includes(token.assetId)) {
            return
          }

          portfolio.accounts.byId[accountId].assetIds.push(token.assetId)
          // add assetId without dupes
          portfolio.assetBalances.ids = Array.from(
            new Set([...portfolio.assetBalances.ids, token.assetId]),
          )

          // if token already exist inside assetBalances, add balance to existing balance
          portfolio.assetBalances.byId[token.assetId] = sumBalance(
            portfolio.assetBalances.byId[token.assetId] ?? '0',
            token.balance,
          )

          portfolio.accountBalances.byId[accountSpecifier] = {
            ...portfolio.accountBalances.byId[accountSpecifier],
            [token.assetId]: token.balance,
          }
        })
        break
      }
      case ChainTypes.Bitcoin: {
        const btcAccount = account as chainAdapters.Account<ChainTypes.Bitcoin>
        const { balance, chainId, assetId, pubkey } = account
        // Since btc the pubkeys (address) are base58Check encoded, we don't want to lowercase them and put them in state
        const accountSpecifier = `${chainId}:${pubkey}`
        const addresses = btcAccount.chainSpecific.addresses ?? []

        portfolio.assetBalances.ids.push(assetId)
        portfolio.accountBalances.ids.push(accountSpecifier)
        portfolio.accountSpecifiers.ids.push(accountSpecifier)

        // initialize this
        portfolio.accountBalances.byId[accountSpecifier] = {}

        // add the balance from the top level of the account
        portfolio.accountBalances.byId[accountSpecifier][assetId] = balance

        // initialize
        if (!portfolio.accounts.byId[accountSpecifier]?.assetIds.length) {
          portfolio.accounts.byId[accountSpecifier] = {
            assetIds: [],
          }
        }

        portfolio.accounts.ids = Array.from(new Set([...portfolio.accounts.ids, accountSpecifier]))

        portfolio.accounts.byId[accountSpecifier].assetIds = Array.from(
          new Set([...portfolio.accounts.byId[accountSpecifier].assetIds, assetId]),
        )

        portfolio.assetBalances.ids = Array.from(new Set([...portfolio.assetBalances.ids, assetId]))

        portfolio.assetBalances.byId[assetId] = bnOrZero(portfolio.assetBalances.byId[assetId])
          .plus(bnOrZero(balance))
          .toString()

        // For tx history, we need to have AccountIds of addresses that may have 0 balances
        // for accountSpecifier to AccountId mapping
        addresses.forEach(({ pubkey }) => {
          const accountId = toAccountId({ chainId, account: pubkey })
          if (!portfolio.accountSpecifiers.byId[accountSpecifier]) {
            portfolio.accountSpecifiers.byId[accountSpecifier] = []
          }

          portfolio.accountSpecifiers.byId[accountSpecifier].push(accountId)
        })

        break
      }
      case ChainTypes.Cosmos:
      case ChainTypes.Osmosis: {
        const cosmosAccount = account as chainAdapters.Account<ChainTypes.Cosmos>
        const { chainId, assetId } = account
        const accountSpecifier = `${chainId}:${_xpubOrAccount}`
        const accountId = toAccountId({ chainId, account: _xpubOrAccount })
        portfolio.accountBalances.ids.push(accountSpecifier)
        portfolio.accountSpecifiers.ids.push(accountSpecifier)

        portfolio.accounts.byId[accountSpecifier] = {
          assetIds: [],
          validatorIds: [],
          stakingDataByValidatorId: {},
        }

        portfolio.accounts.byId[accountSpecifier].assetIds.push(assetId)
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
                .filter(Boolean),
              cosmosAccount.chainSpecific.rewards.map(reward => reward.validator.address),
            ].flat(),
          ),
        )

        portfolio.accounts.byId[accountSpecifier].validatorIds = uniqueValidatorAddresses
        portfolio.accounts.byId[accountSpecifier].stakingDataByValidatorId = {}

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

          let portfolioAccount = portfolio.accounts.byId[accountSpecifier]
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

        portfolio.accounts.ids.push(accountSpecifier)

        portfolio.assetBalances.byId[assetId] = sumBalance(
          portfolio.assetBalances.byId[assetId] ?? '0',
          account.balance,
        )

        // add assetId without dupes
        portfolio.assetBalances.ids = Array.from(new Set([...portfolio.assetBalances.ids, assetId]))

        portfolio.accountBalances.byId[accountSpecifier] = {
          [assetId]: account.balance,
        }

        portfolio.accountSpecifiers.byId[accountSpecifier] = [accountId]

        break
      }
      default:
        break
    }
  })

  return portfolio
}

export const makeSortedAccountBalances = (totalAccountBalances: {
  [k: AccountSpecifier]: string
}) =>
  Object.entries(totalAccountBalances)
    .sort(([_, accountBalanceA], [__, accountBalanceB]) =>
      bnOrZero(accountBalanceA).gte(bnOrZero(accountBalanceB)) ? -1 : 1,
    )
    .map(([accountId, _]) => accountId)

export const makeBalancesByChainBucketsFlattened = (
  accountBalances: string[],
  assets: { [k: AssetId]: Asset },
) => {
  const initial = {} as Record<ChainTypes, AccountId[]>
  const balancesByChainBuckets = accountBalances.reduce<Record<ChainTypes, AccountId[]>>(
    (acc: Record<ChainTypes, AccountId[]>, accountId) => {
      const assetId = accountIdToFeeAssetId(accountId)
      const asset = assets[assetId]
      acc[asset.chain] = [...(acc[asset.chain] ?? []), accountId]
      return acc
    },
    initial,
  )
  return Object.values(balancesByChainBuckets).flat()
}

export const isAssetSupportedByWallet = (assetId: AssetId, wallet: HDWallet): boolean => {
  if (!assetId) return false
  const { chain, network } = fromAssetId(assetId)
  const chainId = toChainId({ chain, network })
  switch (chainId) {
    case ethChainId:
      return supportsETH(wallet)
    case btcChainId:
      return supportsBTC(wallet)
    case cosmosChainId:
      return supportsCosmos(wallet)
    default:
      return false
  }
}
