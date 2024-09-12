import { ASSET_NAMESPACE, bscChainId, toAssetId } from '@shapeshiftoss/caip'
import type { Asset, AssetsByIdPartial } from '@shapeshiftoss/types'
import { fetchPortalsPlatforms, fetchPortalsTokens, maybeTokenImage } from 'lib/portals/utils'
import { isSome } from 'lib/utils'

import generatedAssetData from '../../../src/lib/asset-service/service/generatedAssetData.json'
import { colorMap } from '../colorMap'

const assets = generatedAssetData as unknown as AssetsByIdPartial

const PORTALS_API_KEY = process.env.REACT_APP_PORTALS_API_KEY
const PORTALS_BASE_URL = process.env.REACT_APP_PORTALS_BASE_URL
if (!PORTALS_API_KEY) throw new Error('REACT_APP_PORTALS_API_KEY not set')
if (!PORTALS_BASE_URL) throw new Error('REACT_APP_PORTALS_BASE_URL not set')

export const getPortalTokens = async (nativeAsset: Asset): Promise<Asset[]> => {
  const portalsPlatforms = await fetchPortalsPlatforms()
  const chainId = nativeAsset.chainId
  const explorerData = {
    explorer: nativeAsset.explorer,
    explorerAddressLink: nativeAsset.explorerAddressLink,
    explorerTxLink: nativeAsset.explorerTxLink,
  }

  const portalsTokens = await fetchPortalsTokens([chainId])
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
