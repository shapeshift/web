import { CAIP2, caip2, CAIP10, caip10, CAIP19, caip19 } from '@shapeshiftoss/caip'
import { utxoAccountParams } from '@shapeshiftoss/chain-adapters'
import { HDWallet, supportsBTC, supportsCosmos, supportsETH } from '@shapeshiftoss/hdwallet-core'
import { BTCInputScriptType } from '@shapeshiftoss/hdwallet-core'
import {
  Asset,
  BIP44Params,
  chainAdapters,
  ChainTypes,
  UtxoAccountType,
} from '@shapeshiftoss/types'
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

export type UtxoParamsAndAccountType = {
  utxoParams: { scriptType: BTCInputScriptType; bip44Params: BIP44Params }
  accountType: UtxoAccountType
}

// TODO(0xdef1cafe): these should be exported from caip2
export const ethChainId = 'eip155:1'
export const btcChainId = 'bip122:000000000019d6689c085ae165831e93'
export const cosmosChainId = 'cosmos:cosmoshub-4'
export const osmosisChainId = 'cosmos:osmosis-1'
export const ethAssetId = 'eip155:1/slip44:60'
export const btcAssetId = 'bip122:000000000019d6689c085ae165831e93/slip44:0'
export const cosmosAssetId = 'cosmos:cosmoshub-4/slip44:118'
export const osmosisAssetId = 'cosmos:osmosis-1/slip44:118'

export const chainIds = [ethChainId, btcChainId, cosmosChainId] as const
export type ChainId = typeof chainIds[number]

// we only need to update this when we support additional chains, which is infrequent
// so it's ok to hardcode this map here
const caip2toCaip19: Record<string, string> = {
  [ethChainId]: ethAssetId,
  [btcChainId]: btcAssetId,
  [cosmosChainId]: cosmosAssetId,
  [osmosisChainId]: osmosisAssetId,
}

export const assetIdtoChainId = (caip19: CAIP19): ChainId => caip19.split('/')[0] as ChainId

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
    case cosmosChainId: {
      return 'Cosmos'
    }
    default: {
      return ''
    }
  }
}

export const chainIdToFeeAssetId = (chainId: CAIP2): CAIP19 => caip2toCaip19[chainId]

// note - this is not really a selector, more of a util
export const accountIdToFeeAssetId = (accountId: AccountSpecifier): CAIP19 =>
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
  assetId: CAIP19,
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
      accountId => assetIdtoChainId(assetId) === accountIdToChainId(accountId),
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
      // TODO: Handle Cosmos ChainType here
      case ChainTypes.Ethereum: {
        const ethAccount = account as chainAdapters.Account<ChainTypes.Ethereum>
        const { caip2, caip19, pubkey } = account
        const accountSpecifier = `${caip2}:${toLower(pubkey)}`
        const CAIP10 = caip10.toCAIP10({ caip2, account: _xpubOrAccount })
        portfolio.accountBalances.ids.push(accountSpecifier)
        portfolio.accountSpecifiers.ids.push(accountSpecifier)

        portfolio.accounts.byId[accountSpecifier] = { assetIds: [] }
        portfolio.accounts.byId[accountSpecifier].assetIds.push(caip19)
        portfolio.accounts.ids.push(accountSpecifier)

        portfolio.assetBalances.byId[caip19] = sumBalance(
          portfolio.assetBalances.byId[caip19] ?? '0',
          ethAccount.balance,
        )

        // add assetId without dupes
        portfolio.assetBalances.ids = Array.from(new Set([...portfolio.assetBalances.ids, caip19]))

        portfolio.accountBalances.byId[accountSpecifier] = {
          [caip19]: ethAccount.balance,
        }

        portfolio.accountSpecifiers.byId[accountSpecifier] = [CAIP10]

        ethAccount.chainSpecific.tokens?.forEach(token => {
          if (!args.assetIds.includes(token.caip19)) {
            return
          }

          portfolio.accounts.byId[CAIP10].assetIds.push(token.caip19)
          // add assetId without dupes
          portfolio.assetBalances.ids = Array.from(
            new Set([...portfolio.assetBalances.ids, token.caip19]),
          )

          // if token already exist inside assetBalances, add balance to existing balance
          portfolio.assetBalances.byId[token.caip19] = sumBalance(
            portfolio.assetBalances.byId[token.caip19] ?? '0',
            token.balance,
          )

          portfolio.accountBalances.byId[accountSpecifier] = {
            ...portfolio.accountBalances.byId[accountSpecifier],
            [token.caip19]: token.balance,
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
        if (!portfolio.accounts.byId[accountSpecifier]?.assetIds.length) {
          portfolio.accounts.byId[accountSpecifier] = {
            assetIds: [],
          }
        }

        portfolio.accounts.ids = Array.from(new Set([...portfolio.accounts.ids, accountSpecifier]))

        portfolio.accounts.byId[accountSpecifier].assetIds = Array.from(
          new Set([...portfolio.accounts.byId[accountSpecifier].assetIds, caip19]),
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
      case ChainTypes.Cosmos:
      case ChainTypes.Osmosis: {
        const cosmosAccount = account as chainAdapters.Account<ChainTypes.Cosmos>
        const { caip2, caip19 } = account
        const accountSpecifier = `${caip2}:${_xpubOrAccount}`
        const accountId = caip10.toCAIP10({ caip2, account: _xpubOrAccount })
        portfolio.accountBalances.ids.push(accountSpecifier)
        portfolio.accountSpecifiers.ids.push(accountSpecifier)

        portfolio.accounts.byId[accountSpecifier] = {
          assetIds: [],
          validatorIds: [],
          stakingData: {
            delegations: [],
            undelegations: [],
            redelegations: [],
            rewards: [],
          },
          stakingDataByValidatorId: {},
        }

        portfolio.accounts.byId[accountSpecifier].assetIds.push(caip19)
        // TODO: refactor this before review
        const uniqueValidatorAddresses: PubKey[] = Array.from(
          new Set(
            [
              cosmosAccount.chainSpecific.delegations.map(
                delegation => delegation.validator.address,
              ),
              cosmosAccount.chainSpecific.undelegations.map(
                undelegation => undelegation.validator.address,
              ),
              cosmosAccount.chainSpecific.rewards.map(reward => reward.validator.address),
            ].flat(),
          ),
        )

        portfolio.accounts.byId[accountSpecifier].validatorIds = uniqueValidatorAddresses
        portfolio.accounts.byId[accountSpecifier].stakingDataByValidatorId = {}

        // TODO: Make it its own util?
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
              // Just to make TS happy, we are sure this is defined because of the assignment before the forEach
              // However, forEach being its own scope loses the narrowing
              if (portfolioAccount?.stakingDataByValidatorId?.[validatorAddress]) {
                portfolioAccount.stakingDataByValidatorId[validatorAddress][assetId] = {
                  delegations: delegations[assetId],
                  undelegations: undelegations[assetId],
                  rewards: rewards[assetId],
                  redelegations: [], // We do not use redelegations for now, let's not store them in store
                }
              }
            })
          }
        })

        portfolio.accounts.ids.push(accountSpecifier)

        portfolio.assetBalances.byId[caip19] = sumBalance(
          portfolio.assetBalances.byId[caip19] ?? '0',
          account.balance,
        )

        // add assetId without dupes
        portfolio.assetBalances.ids = Array.from(new Set([...portfolio.assetBalances.ids, caip19]))

        portfolio.accountBalances.byId[accountSpecifier] = {
          [caip19]: account.balance,
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
  assets: { [k: CAIP19]: Asset },
) => {
  const initial = {} as Record<ChainTypes, CAIP10[]>
  const balancesByChainBuckets = accountBalances.reduce<Record<ChainTypes, CAIP10[]>>(
    (acc: Record<ChainTypes, CAIP10[]>, accountId) => {
      const assetId = accountIdToFeeAssetId(accountId)
      const asset = assets[assetId]
      acc[asset.chain] = [...(acc[asset.chain] ?? []), accountId]
      return acc
    },
    initial,
  )
  return Object.values(balancesByChainBuckets).flat()
}

export const isAssetSupportedByWallet = (assetId: CAIP19, wallet: HDWallet): boolean => {
  if (!assetId) return false
  const { chain, network } = caip19.fromCAIP19(assetId)
  const chainId = caip2.toCAIP2({ chain, network })
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
