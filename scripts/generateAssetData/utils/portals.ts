import type { ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, bscChainId, toAssetId } from '@shapeshiftoss/caip'
import type { Asset, AssetsByIdPartial } from '@shapeshiftoss/types'
import axios from 'axios'
import qs from 'qs'
import { getAddress, isAddressEqual, zeroAddress } from 'viem'
import { CHAIN_ID_TO_PORTALS_NETWORK } from 'lib/market-service/portals/constants'
import type {
  GetPlatformsResponse,
  GetTokensResponse,
  PlatformsById,
  TokenInfo,
} from 'lib/market-service/portals/types'
import { isSome } from 'lib/utils'

import generatedAssetData from '../../../src/lib/asset-service/service/generatedAssetData.json'
import { colorMap } from '../colorMap'
import { createThrottle } from '.'

const assets = generatedAssetData as unknown as AssetsByIdPartial

const PORTALS_API_KEY = process.env.REACT_APP_PORTALS_API_KEY
const PORTALS_BASE_URL = process.env.REACT_APP_PORTALS_BASE_URL
if (!PORTALS_API_KEY) throw new Error('REACT_APP_PORTALS_API_KEY not set')
if (!PORTALS_BASE_URL) throw new Error('REACT_APP_PORTALS_BASE_URL not set')

const fetchPortalsPlatforms = async (): Promise<PlatformsById> => {
  const url = `${PORTALS_BASE_URL}/v2/platforms`

  try {
    const { data: platforms } = await axios.get<GetPlatformsResponse>(url, {
      headers: {
        Authorization: `Bearer ${PORTALS_API_KEY}`,
      },
    })

    const byId = platforms.reduce<PlatformsById>((acc, platform) => {
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

const fetchPortalsTokens = async (
  chainId: ChainId,
  page: number = 0,
  accTokens: TokenInfo[] = [],
): Promise<TokenInfo[]> => {
  const url = `${PORTALS_BASE_URL}/v2/tokens`

  const { throttle, clear } = createThrottle({
    capacity: 500, // 500 rpm as per https://github.com/shapeshift/web/pull/7401#discussion_r1687499650
    costPerReq: 1,
    drainPerInterval: 125, // Replenish 25 requests every 15 seconds
    intervalMs: 15000, // 15 seconds
  })

  const network = CHAIN_ID_TO_PORTALS_NETWORK[chainId]

  try {
    if (!network) throw new Error(`Unsupported chainId: ${chainId}`)

    const params = {
      limit: '250',
      // Minimum 100,000 bucks liquidity if asset is a LP token
      minLiquidity: '100000',
      networks: [network],
      page: page.toString(),
    }

    await throttle()

    const pageResponse = await axios.get<GetTokensResponse>(url, {
      paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat' }),
      headers: {
        Authorization: `Bearer ${PORTALS_API_KEY}`,
      },
      params,
    })

    const pageTokens = pageResponse.data.tokens.filter(
      // Filter out native assets as 0x0 tokens, or problems
      ({ address }) => !isAddressEqual(getAddress(address), zeroAddress),
    )

    const newTokens = accTokens.concat(pageTokens)

    if (pageResponse.data.more) {
      // If there are more pages, recursively fetch the next page
      return fetchPortalsTokens(chainId, page + 1, newTokens)
    } else {
      // No more pages, return all accumulated tokens
      console.log(`Total Portals tokens fetched for ${network}: ${newTokens.length}`)
      clear() // Clear the interval when done
      return newTokens
    }
  } catch (error) {
    clear() // Clear the interval on error
    if (axios.isAxiosError(error)) {
      console.error(`Failed to fetch Portals tokens: ${error.message}`)
    } else {
      console.error(error)
    }
    return accTokens
  }
}

const maybeTokenImage = (image: string | undefined) => {
  if (!image) return
  if (image === 'missing_large.png') return
  return image
}
export const getPortalTokens = async (nativeAsset: Asset): Promise<Asset[]> => {
  const portalsPlatforms = await fetchPortalsPlatforms()
  const chainId = nativeAsset.chainId
  const explorerData = {
    explorer: nativeAsset.explorer,
    explorerAddressLink: nativeAsset.explorerAddressLink,
    explorerTxLink: nativeAsset.explorerTxLink,
  }

  const portalsTokens = await fetchPortalsTokens(chainId)
  return portalsTokens
    .map(token => {
      const assetId = toAssetId({
        chainId,
        assetNamespace: chainId === bscChainId ? ASSET_NAMESPACE.bep20 : ASSET_NAMESPACE.erc20,
        assetReference: token.address,
      })
      const asset = assets[assetId]

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
                assetNamespace:
                  chainId === bscChainId ? ASSET_NAMESPACE.bep20 : ASSET_NAMESPACE.erc20,
                assetReference: token.tokens[i],
              })
              const underlyingAsset = assets[underlyingAssetId]
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
              assetNamespace:
                chainId === bscChainId ? ASSET_NAMESPACE.bep20 : ASSET_NAMESPACE.erc20,
              assetReference: underlyingToken,
            })
            const underlyingAsset = assets[assetId]
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
        color: colorMap[assetId] ?? '#FFFFFF',
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
    })
    .filter(isSome)
}
