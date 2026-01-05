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
  dogeChainId,
  ethChainId,
  fromAccountId,
  fromAssetId,
  fromChainId,
  gnosisChainId,
  hyperEvmChainId,
  isNft,
  ltcChainId,
  mayachainChainId,
  monadChainId,
  nearChainId,
  optimismChainId,
  plasmaChainId,
  polygonChainId,
  solanaChainId,
  starknetChainId,
  suiChainId,
  thorchainChainId,
  toAccountId,
  toAssetId,
  tronChainId,
  zecChainId,
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
  supportsHyperEvm,
  supportsMayachain,
  supportsMonad,
  supportsOptimism,
  supportsPlasma,
  supportsPolygon,
  supportsSolana,
  supportsStarknet,
  supportsSui,
  supportsThorchain,
  supportsTron,
} from '@shapeshiftoss/hdwallet-core'
import { GridPlusHDWallet } from '@shapeshiftoss/hdwallet-gridplus'
import { PhantomHDWallet } from '@shapeshiftoss/hdwallet-phantom'
import type { Asset, EvmChainId, KnownChainIds, UtxoChainId } from '@shapeshiftoss/types'
import type { MinimalAsset } from '@shapeshiftoss/utils'
import { makeAsset } from '@shapeshiftoss/utils'
import { bech32 } from 'bech32'
import cloneDeep from 'lodash/cloneDeep'
import maxBy from 'lodash/maxBy'

import type {
  Portfolio,
  PortfolioAccountBalancesById,
  PortfolioAccounts as PortfolioSliceAccounts,
} from '../portfolioSliceCommon'
import { initialState } from '../portfolioSliceCommon'

import { queryClient } from '@/context/QueryClientProvider/queryClient'
import type { BigNumber } from '@/lib/bignumber/bignumber'
import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { fetchPortalsAccount, fetchPortalsPlatforms, maybeTokenImage } from '@/lib/portals/utils'
import { assertUnreachable, isNativeHDWallet, isTrezorHDWallet, middleEllipsis } from '@/lib/utils'
import { supportsNear } from '@/lib/utils/near'
import { isSpammyNftText, isSpammyTokenText } from '@/state/blacklist'
import type { ReduxState } from '@/state/reducer'
import type { UpsertAssetsPayload } from '@/state/slices/assetsSlice/assetsSlice'

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
    case hyperEvmChainId:
    case monadChainId:
    case plasmaChainId:
    case thorchainChainId:
    case mayachainChainId:
    case cosmosChainId:
    case solanaChainId:
    case starknetChainId:
    case tronChainId:
    case suiChainId:
    case nearChainId:
      return middleEllipsis(pubkey)
    case btcChainId:
      // TODO(0xdef1cafe): translations
      if (pubkey.startsWith('xpub')) return 'Legacy'
      if (pubkey.startsWith('ypub')) return 'Segwit'
      // TODO(gomes): This assumes bc prefix *is* a SegWit Native address, but this will consider both bc1p (P2WPKH) and bc1q (taproot) as SegWit Native
      // which is wrong, but fine for now as we don't support Taproot accounts (P2TR is supported however).
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
    case zecChainId:
      return 'Zcash'
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
}

type AccountToPortfolio = (args: AccountToPortfolioArgs) => Portfolio

// this should live in chain adapters but is here for backwards compatibility
// until we can kill all the other places in web fetching this data
export const accountToPortfolio: AccountToPortfolio = ({ assetIds, portfolioAccounts }) => {
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
            if ([token.name, token.symbol].some(nftText => isSpammyNftText(nftText, true))) return
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
      case CHAIN_NAMESPACE.Tron: {
        const tronAccount = account as Account<KnownChainIds.TronMainnet>
        const { chainId, assetId, pubkey } = account
        const accountId = toAccountId({ chainId, account: pubkey })

        portfolio.accounts.ids.push(accountId)
        portfolio.accounts.byId[accountId] = { assetIds: [assetId], hasActivity }
        portfolio.accountBalances.ids.push(accountId)
        portfolio.accountBalances.byId[accountId] = { [assetId]: account.balance }

        tronAccount.chainSpecific.tokens?.forEach(token => {
          // don't update portfolio if asset is not in the store
          if (!assetIds.includes(token.assetId)) return

          if (bnOrZero(token.balance).gt(0)) portfolio.accounts.byId[accountId].hasActivity = true

          portfolio.accounts.byId[accountId].assetIds.push(token.assetId)
          portfolio.accountBalances.byId[accountId][token.assetId] = token.balance
        })

        break
      }
      case CHAIN_NAMESPACE.Sui: {
        const suiAccount = account as Account<KnownChainIds.SuiMainnet>
        const { chainId, assetId, pubkey } = account
        const accountId = toAccountId({ chainId, account: pubkey })

        portfolio.accounts.ids.push(accountId)
        portfolio.accounts.byId[accountId] = { assetIds: [assetId], hasActivity }
        portfolio.accountBalances.ids.push(accountId)
        portfolio.accountBalances.byId[accountId] = { [assetId]: account.balance }

        suiAccount.chainSpecific.tokens?.forEach(token => {
          // don't update portfolio if asset is not in the store
          if (!assetIds.includes(token.assetId)) return

          if (bnOrZero(token.balance).gt(0)) portfolio.accounts.byId[accountId].hasActivity = true

          portfolio.accounts.byId[accountId].assetIds.push(token.assetId)
          portfolio.accountBalances.byId[accountId][token.assetId] = token.balance
        })

        break
      }
      case CHAIN_NAMESPACE.Near: {
        const nearAccount = account as Account<KnownChainIds.NearMainnet>
        const { chainId, assetId, pubkey } = account
        const accountId = toAccountId({ chainId, account: pubkey })

        portfolio.accounts.ids.push(accountId)
        portfolio.accounts.byId[accountId] = { assetIds: [assetId], hasActivity }
        portfolio.accountBalances.ids.push(accountId)
        portfolio.accountBalances.byId[accountId] = { [assetId]: account.balance }

        nearAccount.chainSpecific.tokens?.forEach(token => {
          if (!assetIds.includes(token.assetId)) return

          if (bnOrZero(token.balance).gt(0)) portfolio.accounts.byId[accountId].hasActivity = true

          portfolio.accounts.byId[accountId].assetIds.push(token.assetId)
          portfolio.accountBalances.byId[accountId][token.assetId] = token.balance
        })

        break
      }
      case CHAIN_NAMESPACE.Starknet: {
        const starknetAccount = account as Account<KnownChainIds.StarknetMainnet>
        const { chainId, assetId, pubkey } = account
        const accountId = toAccountId({ chainId, account: pubkey })

        portfolio.accounts.ids.push(accountId)
        portfolio.accounts.byId[accountId] = { assetIds: [assetId], hasActivity }
        portfolio.accountBalances.ids.push(accountId)
        portfolio.accountBalances.byId[accountId] = { [assetId]: account.balance }

        starknetAccount.chainSpecific.tokens?.forEach(token => {
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
    case CHAIN_NAMESPACE.Tron: {
      const hasActivity = bnOrZero(account.balance).gt(0)

      return hasActivity
    }
    case CHAIN_NAMESPACE.Sui: {
      const suiAccount = account as Account<KnownChainIds.SuiMainnet>

      const hasActivity = bnOrZero(suiAccount.balance).gt(0)

      return hasActivity
    }
    case CHAIN_NAMESPACE.Near: {
      const nearAccount = account as Account<KnownChainIds.NearMainnet>
      const hasActivity = bnOrZero(nearAccount.balance).gt(0)
      return hasActivity
    }
    case CHAIN_NAMESPACE.Starknet: {
      const starknetAccount = account as Account<KnownChainIds.StarknetMainnet>

      const hasActivity = bnOrZero(starknetAccount.balance).gt(0)

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
      return (
        supportsBTC(wallet) &&
        !(wallet instanceof PhantomHDWallet) &&
        !(wallet instanceof GridPlusHDWallet)
      )
    case dogeChainId:
      return (
        supportsBTC(wallet) &&
        !(wallet instanceof PhantomHDWallet) &&
        !(wallet instanceof GridPlusHDWallet)
      )
    case bchChainId:
      return (
        supportsBTC(wallet) &&
        !(wallet instanceof PhantomHDWallet) &&
        !(wallet instanceof GridPlusHDWallet)
      )
    case zecChainId:
      return supportsBTC(wallet) && (isNativeHDWallet(wallet) || isTrezorHDWallet(wallet))
    case cosmosChainId:
      return supportsCosmos(wallet)
    case thorchainChainId:
      return supportsThorchain(wallet)
    case mayachainChainId:
      return supportsMayachain(wallet)
    case solanaChainId:
      return supportsSolana(wallet)
    case suiChainId:
      return supportsSui(wallet)
    case starknetChainId:
      return supportsStarknet(wallet)
    case monadChainId:
      return supportsMonad(wallet)
    case hyperEvmChainId:
      return supportsHyperEvm(wallet)
    case plasmaChainId:
      return supportsPlasma(wallet)
    case tronChainId:
      return supportsTron(wallet)
    case nearChainId:
      return supportsNear(wallet)
    default:
      return false
  }
}

export const genericBalanceByFilter = (
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
    const assetNamespace = ASSET_NAMESPACE.erc20
    const tokens = account.chainSpecific.tokens ?? []

    const hasUnknownTokens = tokens.some(token => {
      const isSpam = [token.name, token.symbol].some(text => {
        if (isNft(token.assetId)) return isSpammyNftText(text)
        return isSpammyTokenText(text)
      })
      return !state.assets.byId[token.assetId] && !isSpam
    })

    if (!hasUnknownTokens) return undefined

    const hasServerEnrichedTokens = tokens.some(
      t => 'isPool' in t || 'platform' in t || 'liquidity' in t,
    )

    const maybePortalsAccounts = hasServerEnrichedTokens
      ? {}
      : await queryClient.fetchQuery({
          queryFn: () => fetchPortalsAccount(chainId, pubkey),
          queryKey: ['portalsAccount', chainId, pubkey],
          staleTime: Infinity,
        })
    const maybePortalsPlatforms = await queryClient.fetchQuery({
      queryFn: () => fetchPortalsPlatforms(),
      queryKey: ['portalsPlatforms'],
      staleTime: Infinity,
    })

    return tokens.reduce<UpsertAssetsPayload>(
      (prev, token) => {
        const isSpam = [token.name, token.symbol].some(text => {
          if (isNft(token.assetId)) return isSpammyNftText(text)
          return isSpammyTokenText(text)
        })

        if (state.assets.byId[token.assetId] || isSpam) return prev

        const minimalAsset: MinimalAsset = token

        const enrichedToken = token as typeof token & {
          isPool?: boolean
          platform?: string
          underlyingTokens?: string[]
          images?: string[]
          liquidity?: number
        }

        const hasEnrichment = enrichedToken.platform !== undefined
        const maybePortalsAsset = hasEnrichment ? undefined : maybePortalsAccounts[token.assetId]

        const tokenPlatform = enrichedToken.platform ?? maybePortalsAsset?.platform
        const tokenUnderlyingTokens = enrichedToken.underlyingTokens ?? maybePortalsAsset?.tokens
        const tokenImages = enrichedToken.images ?? maybePortalsAsset?.images
        const tokenLiquidity = enrichedToken.liquidity ?? maybePortalsAsset?.liquidity
        const tokenName = enrichedToken.name ?? maybePortalsAsset?.name
        const isPool =
          enrichedToken.isPool ?? Boolean(tokenPlatform && tokenUnderlyingTokens?.length)

        if (tokenPlatform !== undefined || maybePortalsAsset) {
          if (!tokenLiquidity) return prev

          const platform = maybePortalsPlatforms[tokenPlatform ?? '']

          const name = (() => {
            if (!isPool) return tokenName

            const assetSymbols =
              tokenUnderlyingTokens?.map(underlyingToken => {
                const assetId = toAssetId({
                  chainId,
                  assetNamespace,
                  assetReference: underlyingToken,
                })
                const asset = state.assets.byId[assetId]

                if (!asset) return undefined

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

            if (assetSymbols.some(symbol => !symbol)) return `${token.name} Pool`
            return platform
              ? `${platform.name} ${assetSymbols.join('/')} Pool`
              : `${token.name} Pool`
          })()

          const [, ...assetImages] = tokenImages ?? []

          const { icon, icons } = ((): Pick<Asset, 'icon' | 'icons'> => {
            if (!assetImages?.length) {
              return { icon: state.assets.byId[token.assetId]?.icon }
            }

            if (assetImages.length === 1) {
              return { icon: maybeTokenImage(assetImages[0]) }
            }

            if (assetImages.length > 1) {
              return {
                icons: assetImages.map((image, i) => {
                  const underlyingToken = tokenUnderlyingTokens?.[i]

                  if (!underlyingToken) return maybeTokenImage(image) || ''

                  const assetId = toAssetId({
                    chainId,
                    assetNamespace,
                    assetReference: underlyingToken,
                  })
                  const asset = state.assets.byId[assetId]

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

        const asset = makeAsset(state.assets.byId, minimalAsset)

        if (!asset.precision && !isNft(asset.assetId)) {
          return prev
        }
        prev.byId[token.assetId] = asset
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
        if (state.assets.byId[token.assetId]) return prev

        prev.byId[token.assetId] = makeAsset(state.assets.byId, { ...token })
        prev.ids.push(token.assetId)

        return prev
      },
      { byId: {}, ids: [] },
    )
  }

  if (chainId === tronChainId) {
    const account = portfolioAccounts[pubkey] as Account<KnownChainIds.TronMainnet>

    return (account.chainSpecific.tokens ?? []).reduce<UpsertAssetsPayload>(
      (prev, token) => {
        if (state.assets.byId[token.assetId]) return prev

        prev.byId[token.assetId] = makeAsset(state.assets.byId, { ...token })
        prev.ids.push(token.assetId)

        return prev
      },
      { byId: {}, ids: [] },
    )
  }

  if (chainId === suiChainId) {
    const account = portfolioAccounts[pubkey] as Account<KnownChainIds.SuiMainnet>

    return (account.chainSpecific.tokens ?? []).reduce<UpsertAssetsPayload>(
      (prev, token) => {
        if (state.assets.byId[token.assetId]) return prev

        prev.byId[token.assetId] = makeAsset(state.assets.byId, { ...token })
        prev.ids.push(token.assetId)

        return prev
      },
      { byId: {}, ids: [] },
    )
  }

  if (chainId === starknetChainId) {
    const account = portfolioAccounts[pubkey] as Account<KnownChainIds.StarknetMainnet>

    return (account.chainSpecific.tokens ?? []).reduce<UpsertAssetsPayload>(
      (prev, token) => {
        if (state.assets.byId[token.assetId]) return prev

        prev.byId[token.assetId] = makeAsset(state.assets.byId, { ...token })
        prev.ids.push(token.assetId)

        return prev
      },
      { byId: {}, ids: [] },
    )
  }
}
