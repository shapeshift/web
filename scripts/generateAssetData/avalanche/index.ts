import { avalancheChainId, toAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import axios from 'axios'
import qs from 'qs'

import { avax } from '../baseAssets'
import * as coingecko from '../coingecko'
import { colorMap } from '../colorMap'
import { getRenderedIdenticonBase64 } from '../generateAssetIcon/generateAssetIcon'

const explorerData = {
  explorer: avax.explorer,
  explorerAddressLink: avax.explorerAddressLink,
  explorerTxLink: avax.explorerTxLink,
}

// Non-exhaustive - https://api.portals.fi/docs#/Supported/SupportedController_getSupportedTokensV2 for full docs
type TokenInfo = {
  key: string
  name: string
  decimals: number
  symbol: string
  address: string
  images: string[] | undefined
}

type GetTokensResponse = {
  totalItems: number
  pageItems: number
  more: boolean
  page: number
  tokens: TokenInfo[]
}

export const getAssets = async (): Promise<Asset[]> => {
  const [assets, portalsAssets] = await Promise.all([
    coingecko.getAssets(avalancheChainId),
    getPortalTokens(),
  ])
  return [...assets, ...portalsAssets, avax].map(asset => ({
    ...asset,
    icon:
      asset.icon ||
      getRenderedIdenticonBase64(asset.assetId, asset.symbol, {
        identiconImage: { size: 128, background: [45, 55, 72, 255] },
        identiconText: { symbolScale: 7, enableShadow: true },
      }),
  }))
}

const fetchPortalsTokens = async (
  page: number = 0,
  accTokens: TokenInfo[] = [],
): Promise<TokenInfo[]> => {
  const url = 'https://api.portals.fi/v2/tokens'
  const PORTALS_API_KEY = process.env.REACT_APP_PORTALS_API_KEY
  if (!PORTALS_API_KEY) throw new Error('REACT_APP_PORTALS_API_KEY not set')

  const params = {
    // Maximum supported limit, enough to get a viable diff, but low enough to not make this huge as a PoC
    limit: '250',
    // Only Avalanche for PoC, more to be added later
    networks: ['avalanche'],
    page: page.toString(),
  }

  try {
    const pageResponse = await axios.get<GetTokensResponse>(url, {
      paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat' }),
      headers: {
        Authorization: `Bearer ${PORTALS_API_KEY}`,
      },
      params,
    })

    const newTokens = [...accTokens, ...pageResponse.data.tokens]

    if (pageResponse.data.more) {
      // If there are more pages, recursively fetch the next page
      return fetchPortalsTokens(page + 1, newTokens)
    } else {
      // No more pages, return all accumulated tokens
      console.log(`Total Portals tokens fetched for Avalanche: ${newTokens.length}`)
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
export const getPortalTokens = async (): Promise<Asset[]> => {
  const portalsTokens = await fetchPortalsTokens()
  return portalsTokens.map(token => {
    const assetId = toAssetId({
      chainId: avalancheChainId,
      assetNamespace: 'erc20',
      assetReference: token.address,
    })

    return {
      ...explorerData,
      color: colorMap[assetId] ?? '#FFFFFF',
      icon: token.images?.[0] ?? '',
      icons: token.images ?? [],
      name: token.name,
      precision: Number(token.decimals),
      symbol: token.symbol,
      chainId: avalancheChainId,
      assetId,
    }
  })
}
