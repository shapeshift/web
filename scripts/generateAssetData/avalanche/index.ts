import { avalancheChainId, toAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import axios from 'axios'
import util from 'util'

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
  images: string[]
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

const fetchPortalsTokens = async (): Promise<TokenInfo[]> => {
  const url = 'https://api.portals.fi/v2/tokens'
  const PORTALS_API_KEY = process.env.REACT_APP_PORTALS_API_KEY
  if (!PORTALS_API_KEY) throw new Error('REACT_APP_PORTALS_API_KEY not set')

  const params = new URLSearchParams({
    // Maximum supported limit, enough to get a viable diff, but low enough to not make this huge as a PoC
    limit: '250',
    // Only Avalanche for PoC, more to be added later
    networks: 'avalanche',
  })

  try {
    const response = await axios.get<GetTokensResponse>(url, {
      headers: {
        Authorization: `Bearer ${PORTALS_API_KEY}`,
      },
      params,
    })
    const tokens = response.data.tokens
    // TODO(gomes): remove me before opening,
    console.log('Portals tokens fetched!')
    util.inspect(tokens, false, null, true)
    return tokens
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`Failed to fetch Portals tokens: ${error.message}`)
    }
    console.error(error)
    return []
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
      icon: token.images[0] ?? '',
      icons: token.images,
      name: token.name,
      precision: Number(token.decimals),
      symbol: token.symbol,
      chainId: avalancheChainId,
      assetId,
    }
  })
}
