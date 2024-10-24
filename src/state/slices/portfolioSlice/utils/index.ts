import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  arbitrumNovaChainId,
  ASSET_NAMESPACE,
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
  solanaChainId,
  thorchainChainId,
  toAccountId,
  toAssetId,
} from '@shapeshiftoss/caip'
import type { Account } from '@shapeshiftoss/chain-adapters'
import { evmChainIds } from '@shapeshiftoss/chain-adapters'
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
  supportsSolana,
  supportsThorchain,
} from '@shapeshiftoss/hdwallet-core'
import { PhantomHDWallet } from '@shapeshiftoss/hdwallet-phantom'
import type { Asset, EvmChainId, KnownChainIds, UtxoChainId } from '@shapeshiftoss/types'
import type { MinimalAsset } from '@shapeshiftoss/utils'
import { makeAsset } from '@shapeshiftoss/utils'
import { bech32 } from 'bech32'
import cloneDeep from 'lodash/cloneDeep'
import maxBy from 'lodash/maxBy'
import { queryClient } from 'context/QueryClientProvider/queryClient'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fetchPortalsAccount, fetchPortalsPlatforms, maybeTokenImage } from 'lib/portals/utils'
import { assertUnreachable, firstFourLastFour } from 'lib/utils'
import { isSpammyNftText, isSpammyTokenText } from 'state/apis/nft/constants'
import type { NftCollectionType } from 'state/apis/nft/types'
import type { ReduxState } from 'state/reducer'
import type { UpsertAssetsPayload } from 'state/slices/assetsSlice/assetsSlice'

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
    case solanaChainId:
      return firstFourLastFour(pubkey)
    case btcChainId:
      // TODO(0xdef1cafe): translations
      if (pubkey.startsWith('xpub')) return 'Legacy'
      if (pubkey.startsWith('ypub')) return 'Segwit'
      // TODO(gomes): This assumes bc prefix *is* a SegWit Native address, but this will consider both bc1p (P2WPKH) and bc1q (taproot) as SegWit Native
      // which is wrong, but fine for now as we don't support Taproot.
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
      case CHAIN_NAMESPACE.Solana: {
        const solanaAccount = account as Account<KnownChainIds.SolanaMainnet>
        const { chainId, assetId, pubkey } = account
        const accountId = toAccountId({ chainId, account: pubkey })

        portfolio.accounts.ids.push(accountId)
        portfolio.accounts.byId[accountId] = { assetIds: [assetId], hasActivity }
        portfolio.accountBalances.ids.push(accountId)
        portfolio.accountBalances.byId[accountId] = { [assetId]: account.balance }

        solanaAccount.chainSpecific.tokens?.forEach(token => {
          // don't update portfolio if asset is not in the store
          if (!assetIds.includes(token.assetId)) return

          if (bnOrZero(token.balance).gt(0)) portfolio.accounts.byId[accountId].hasActivity = true

          portfolio.accounts.byId[accountId].assetIds.push(token.assetId)
          portfolio.accountBalances.byId[accountId][token.assetId] = token.balance
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
    case CHAIN_NAMESPACE.Solana: {
      const solanaAccount = account as Account<KnownChainIds.SolanaMainnet>

      const hasActivity = bnOrZero(solanaAccount.balance).gt(0)

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
      return supportsBTC(wallet)
    case ltcChainId:
      return supportsBTC(wallet) && !(wallet instanceof PhantomHDWallet)
    case dogeChainId:
      return supportsBTC(wallet) && !(wallet instanceof PhantomHDWallet)
    case bchChainId:
      return supportsBTC(wallet) && !(wallet instanceof PhantomHDWallet)
    case cosmosChainId:
      return supportsCosmos(wallet)
    case thorchainChainId:
      return supportsThorchain(wallet)
    case solanaChainId:
      return supportsSolana(wallet)
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

export const makeAssets = async ({
  chainId,
  pubkey,
  state,
  portfolioAccounts,
}: {
  chainId: ChainId
  pubkey: string
  state: ReduxState
  portfolioAccounts: Record<string, Account<KnownChainIds>>
}): Promise<UpsertAssetsPayload | undefined> => {
  if (evmChainIds.includes(chainId as EvmChainId)) {
    const account = portfolioAccounts[pubkey] as Account<EvmChainId>
    const assetNamespace = chainId === bscChainId ? ASSET_NAMESPACE.bep20 : ASSET_NAMESPACE.erc20

    const maybePortalsAccounts = await fetchPortalsAccount(chainId, pubkey)
    const maybePortalsPlatforms = await queryClient.fetchQuery({
      queryFn: () => fetchPortalsPlatforms(),
      queryKey: ['portalsPlatforms'],
    })

    return (account.chainSpecific.tokens ?? []).reduce<UpsertAssetsPayload>(
      (prev, token) => {
        const isSpam = [token.name, token.symbol].some(text => {
          if (isNft(token.assetId)) return isSpammyNftText(text)
          return isSpammyTokenText(text)
        })

        if (state.assets.byId[token.assetId] || isSpam) return prev

        const minimalAsset: MinimalAsset = token

        const maybePortalsAsset = maybePortalsAccounts[token.assetId]
        if (maybePortalsAsset) {
          const isPool = Boolean(maybePortalsAsset.platform && maybePortalsAsset.tokens?.length)
          const platform = maybePortalsPlatforms[maybePortalsAsset.platform]

          const name = (() => {
            // For single assets, just use the token name
            if (!isPool) return maybePortalsAsset.name

            // For pools, create a name in the format of "<platform> <assets> Pool"
            // e.g "UniswapV2 ETH/FOX Pool"
            const assetSymbols =
              maybePortalsAsset.tokens?.map(token => {
                const assetId = toAssetId({ chainId, assetNamespace, assetReference: token })
                const asset = state.assets.byId[assetId]

                if (!asset) return undefined

                // This doesn't generalize, but this'll do, this is only a visual hack to display native asset instead of wrapped
                // We could potentially use related assets for this and use primary implementation, though we'd have to remove BTC from there as WBTC and BTC are very
                // much different assets on diff networks, i.e can't deposit BTC instead of WBTC automagically like you would with ETH instead of WETH
                switch (asset.symbol) {
                  case 'WETH':
                    return 'ETH'
                  case 'WBNB':
                    return 'BNB'
                  case 'WMATIC':
                    return 'MATIC'
                  case 'WAVAX':
                    return 'AVAX'
                  default:
                    return asset.symbol
                }
              }) ?? []

            // Our best effort to contruct sane name using the native asset -> asset naming hack failed, but thankfully, upstream name is very close e.g
            // for "UniswapV2 LP TRUST/WETH", we just have to append "Pool" to that and we're gucci
            if (assetSymbols.some(symbol => !symbol)) return `${token.name} Pool`
            return `${platform.name} ${assetSymbols.join('/')} Pool`
          })()

          const [, ...assetImages] = maybePortalsAsset.images ?? []

          const { icon, icons } = ((): Pick<Asset, 'icon' | 'icons'> => {
            // There are no underlying tokens' images, return asset icon if it exists
            if (!assetImages?.length) {
              return { icon: state.assets.byId[token.assetId]?.icon }
            }

            if (assetImages.length === 1) {
              return { icon: maybeTokenImage(maybePortalsAsset.image || assetImages[0]) }
            }

            // This is a multiple assets pool, populate icons array
            if (assetImages.length > 1) {
              return {
                icons: assetImages.map((image, i) => {
                  const token = maybePortalsAsset.tokens[i]

                  // No token at that index, but this isn't reliable as we've found out, it may be missing in tokens but present in images
                  // However, this has to be an early return and we can't use our own flavour of that asset... because we have no idea which asset it is.
                  if (!token) return maybeTokenImage(image) || ''

                  const assetId = toAssetId({ chainId, assetNamespace, assetReference: token })
                  const asset = state.assets.byId[assetId]

                  // Prioritise our own flavour of icons for that asset if available, else use upstream if present
                  return asset?.icon || maybeTokenImage(image) || ''
                }),
                icon: undefined,
              }
            }

            return { icon: undefined, icons: undefined }
          })()

          minimalAsset.name = name
          minimalAsset.isPool = isPool
          minimalAsset.icon = icon
          minimalAsset.icons = icons
        }

        prev.byId[token.assetId] = makeAsset(state.assets.byId, minimalAsset)
        prev.ids.push(token.assetId)

        return prev
      },
      { byId: {}, ids: [] },
    )
  }

  if (chainId === solanaChainId) {
    const account = portfolioAccounts[pubkey] as Account<KnownChainIds.SolanaMainnet>

    return (account.chainSpecific.tokens ?? []).reduce<UpsertAssetsPayload>(
      (prev, token) => {
        prev.byId[token.assetId] = makeAsset(state.assets.byId, { ...token })
        prev.ids.push(token.assetId)

        return prev
      },
      { byId: {}, ids: [] },
    )
  }
}
