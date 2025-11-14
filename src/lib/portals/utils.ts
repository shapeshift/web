import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, bscChainId, toAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { isSome } from '@shapeshiftoss/utils'
import axios from 'axios'
import { getAddress, isAddress, isAddressEqual, zeroAddress } from 'viem'

import { CHAIN_ID_TO_PORTALS_NETWORK } from './constants'
import type {
  GetBalancesResponse,
  GetPlatformsResponse,
  GetTokensResponse,
  PlatformsById,
  TokenInfo,
} from './types'

import { getConfig } from '@/config'
import { queryClient } from '@/context/QueryClientProvider/queryClient'
import { localAssetData } from '@/lib/asset-service'

const PORTALS_BASE_URL = getConfig().VITE_PORTALS_BASE_URL

export const fetchPortalsTokens = async ({
  chainIds,
  page = 0,
  accTokens = [],
  minApy,
  maxApy,
  sortBy,
  sortDirection,
  totalLimit,
  tags,
}: {
  chainIds: ChainId[] | undefined
  page?: number
  accTokens?: TokenInfo[]
  minApy?: string
  maxApy?: string
  sortBy?:
    | 'key'
    | 'decimals'
    | 'name'
    | 'symbol'
    | 'updatedAt'
    | 'price'
    | 'liquidity'
    | 'platform'
    | 'network'
    | 'apy'
    | 'volumeUsd1d'
    | 'volumeUsd7d'
  sortDirection?: 'asc' | 'desc'
  totalLimit: number | 'all'
  tags?: string[]
}): Promise<TokenInfo[]> => {
  const networks = chainIds?.map(chainId => CHAIN_ID_TO_PORTALS_NETWORK[chainId])

  if (typeof networks === 'object') {
    networks.forEach((network, i) => {
      if (!network) throw new Error(`Unsupported chainId: ${chainIds?.[i]}`)
    })
  }

  const supportedNetworks = typeof networks === 'object' ? networks.filter(isSome) : undefined

  try {
    const pageResponse = await axios.get<GetTokensResponse>(`${PORTALS_BASE_URL}/v2/tokens`, {
      params: {
        // fetch remaining tokens needed (up to 250 max per page)
        limit: Math.min(totalLimit === 'all' ? 250 : Number(totalLimit) - accTokens.length, 250),
        // Minimum 100,000 bucks liquidity if asset is a LP token
        minLiquidity: '100000',
        // undefined means all networks
        networks: supportedNetworks,
        page: page.toString(),
        sortBy,
        sortDirection,
        minApy,
        maxApy,
        tags,
      },
      paramsSerializer: { indexes: null },
    })

    const pageTokens = pageResponse.data.tokens.filter(
      // Filter out native assets as 0x0 tokens, or problems
      ({ address }) => isAddress(address) && !isAddressEqual(getAddress(address), zeroAddress),
    )

    const newTokens = accTokens.concat(pageTokens)

    if (pageResponse.data.more && (totalLimit === 'all' || newTokens.length < Number(totalLimit))) {
      // If there are more pages, recursively fetch the next page
      return fetchPortalsTokens({
        chainIds,
        page: page + 1,
        accTokens: newTokens,
        totalLimit,
        minApy,
        maxApy,
        sortBy,
        sortDirection,
        tags,
      })
    } else {
      // No more pages, return all accumulated tokens
      console.log(
        `Total Portals tokens fetched for ${networks ? networks.join(', ') : 'all chains'}: ${
          newTokens.length
        }`,
      )
      return newTokens
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`Failed to fetch Portals tokens: ${error.message}`)
    } else {
      console.error(error)
    }
    return accTokens
  }
}

export const portalTokenToAsset = ({
  token,
  portalsPlatforms,
  chainId,
  nativeAsset,
}: {
  token: TokenInfo
  portalsPlatforms: PlatformsById
  chainId: ChainId
  nativeAsset: Asset
}): Asset | undefined => {
  const assetId = toAssetId({
    chainId,
    assetNamespace: chainId === bscChainId ? ASSET_NAMESPACE.bep20 : ASSET_NAMESPACE.erc20,
    assetReference: token.address,
  })
  const asset = localAssetData[assetId]

  const explorerData = {
    explorer: nativeAsset.explorer,
    explorerAddressLink: nativeAsset.explorerAddressLink,
    explorerTxLink: nativeAsset.explorerTxLink,
  }

  const platform = portalsPlatforms[token.platform]
  const isPool = Boolean(platform && token.tokens?.length) || undefined

  const images = token.images ?? []
  const [, ...underlyingAssetsImages] = images
  const iconOrIcons = (() => {
    // There are no underlying tokens' images, return asset icon if it exists
    if (!underlyingAssetsImages?.length) return { icon: asset?.icon }

    if (underlyingAssetsImages.length === 1) {
      return { icon: maybeTokenImage(token.image || underlyingAssetsImages[0]) }
    }
    // This is a multiple assets pool, populate icons array
    if (underlyingAssetsImages.length > 1)
      return {
        icons: underlyingAssetsImages.map((underlyingAssetsImage, i) => {
          // No token at that index, but this isn't reliable as we've found out, it may be missing in tokens but present in images
          // However, this has to be an early return and we can't use our own flavour of that asset... because we have no idea which asset it is.
          if (!token.tokens[i]) return maybeTokenImage(underlyingAssetsImage)

          const underlyingAssetId = toAssetId({
            chainId,
            assetNamespace: chainId === bscChainId ? ASSET_NAMESPACE.bep20 : ASSET_NAMESPACE.erc20,
            assetReference: token.tokens[i],
          })
          const underlyingAsset = localAssetData[underlyingAssetId]
          // Prioritise our own flavour of icons for that asset if available, else use upstream if present
          return underlyingAsset?.icon || maybeTokenImage(underlyingAssetsImage)
        }),
        icon: undefined,
      }
  })()

  // No icons in assets, nor upstream
  if (!iconOrIcons?.icon && !iconOrIcons?.icons?.some(isSome)) return undefined

  // New naming logic
  const name = (() => {
    // For single assets, just use the token name
    if (!isPool) return token.name
    // For pools, create a name in the format of "<platform> <assets> Pool"
    // e.g "UniswapV2 ETH/FOX Pool"
    const assetSymbols =
      token.tokens?.map(underlyingToken => {
        const assetId = toAssetId({
          chainId,
          assetNamespace: chainId === bscChainId ? ASSET_NAMESPACE.bep20 : ASSET_NAMESPACE.erc20,
          assetReference: underlyingToken,
        })
        const underlyingAsset = localAssetData[assetId]
        if (!underlyingAsset) return undefined

        // This doesn't generalize, but this'll do, this is only a visual hack to display native asset instead of wrapped
        // We could potentially use related assets for this and use primary implementation, though we'd have to remove BTC from there as WBTC and BTC are very
        // much different assets on diff networks, i.e can't deposit BTC instead of WBTC automagically like you would with ETH instead of WETH
        switch (underlyingAsset.symbol) {
          case 'WETH':
            return 'ETH'
          case 'WBNB':
            return 'BNB'
          case 'WMATIC':
            return 'MATIC'
          case 'WPOL':
            return 'POL'
          case 'WAVAX':
            return 'AVAX'
          default:
            return underlyingAsset.symbol
        }
      }) ?? []

    // Our best effort to contruct sane name using the native asset -> asset naming hack failed, but thankfully, upstream name is very close e.g
    // for "UniswapV2 LP TRUST/WETH", we just have to append "Pool" to that and we're gucci
    if (assetSymbols.some(symbol => !symbol)) return `${token.name} Pool`
    return `${platform.name} ${assetSymbols.join('/')} Pool`
  })()

  return {
    ...explorerData,
    color: localAssetData[assetId]?.color ?? '#FFFFFF',
    // This looks weird but we need this - l.165 check above nulls the type safety of this object, so we cast it back
    ...(iconOrIcons as { icon: string } | { icons: string[]; icon: undefined }),
    name,
    precision: Number(token.decimals),
    symbol: token.symbol,
    chainId: nativeAsset.chainId,
    assetId,
    relatedAssetKey: undefined,
    // undefined short-circuit isn't a mistake - JSON doesn't support undefined, so this will avoid adding an additional line to the JSON
    // for non-pool assets
    isPool,
  }
}

export const getPortalTokens = async (
  nativeAsset: Asset,
  limit: number | 'all',
): Promise<Asset[]> => {
  const portalsPlatforms = await queryClient.fetchQuery({
    queryFn: () => fetchPortalsPlatforms(),
    queryKey: ['portalsPlatforms'],
    // This should effectively be considered static as far as the lifecycle of the app/our usage is concerned
    staleTime: Infinity,
  })
  const chainId = nativeAsset.chainId

  const portalsTokens = await fetchPortalsTokens({ chainIds: [chainId], totalLimit: limit })
  return portalsTokens
    .map(token =>
      token.liquidity > 0
        ? portalTokenToAsset({ token, portalsPlatforms, chainId, nativeAsset })
        : undefined,
    )
    .filter(isSome)
}

export const fetchPortalsPlatforms = async (): Promise<PlatformsById> => {
  try {
    const { data } = await axios.get<GetPlatformsResponse>(`${PORTALS_BASE_URL}/v2/platforms`)

    const byId = data.reduce<PlatformsById>((acc, platform) => {
      acc[platform.platform] = platform
      return acc
    }, {})

    return byId
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`Failed to fetch Portals platforms: ${error.message}`)
    }
    console.error(`Failed to fetch Portals platforms: ${error}`)

    return {}
  }
}

export const fetchPortalsAccount = async (
  chainId: ChainId,
  owner: string,
): Promise<Record<AssetId, TokenInfo>> => {
  const network = CHAIN_ID_TO_PORTALS_NETWORK[chainId]

  if (!network) throw new Error(`Unsupported chainId: ${chainId}`)

  try {
    const { data } = await axios.get<GetBalancesResponse>(`${PORTALS_BASE_URL}/v2/account`, {
      params: {
        networks: [network],
        owner,
      },
    })

    return data.balances.reduce<Record<AssetId, TokenInfo>>((acc, token) => {
      const assetId = toAssetId({
        chainId,
        assetNamespace: chainId === bscChainId ? ASSET_NAMESPACE.bep20 : ASSET_NAMESPACE.erc20,
        assetReference: token.address,
      })
      acc[assetId] = token
      return acc
    }, {})
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`Failed to fetch Portals account: ${error.message}`)
    } else {
      console.error(error)
    }
    return {}
  }
}

export const maybeTokenImage = (image: string | undefined) => {
  if (!image) return
  if (image === 'missing_large.png') return
  return image
}
