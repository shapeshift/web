import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, bscChainId, toAssetId } from '@shapeshiftoss/caip'
import { createThrottle, isSome } from '@shapeshiftoss/utils'
import axios from 'axios'
import { getConfig } from 'config'
import qs from 'qs'
import { getAddress, isAddressEqual, zeroAddress } from 'viem'

import { CHAIN_ID_TO_PORTALS_NETWORK } from './constants'
import type {
  GetBalancesResponse,
  GetPlatformsResponse,
  GetTokensResponse,
  PlatformsById,
  TokenInfo,
} from './types'

// Accommodate for script vs. web shenanigans
const PORTALS_BASE_URL =
  process.env.REACT_APP_PORTALS_BASE_URL || getConfig().REACT_APP_PORTALS_BASE_URL
const PORTALS_API_KEY =
  process.env.REACT_APP_PORTALS_API_KEY || getConfig().REACT_APP_PORTALS_API_KEY

export const fetchPortalsTokens = async (
  chainIds: ChainId[] | undefined,
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

  const networks = chainIds?.map(chainId => CHAIN_ID_TO_PORTALS_NETWORK[chainId])

  if (typeof networks === 'object') {
    networks.forEach((network, i) => {
      if (!network) throw new Error(`Unsupported chainId: ${chainIds![i]}`)
    })
  }

  const supportedNetworks = typeof networks === 'object' ? networks.filter(isSome) : undefined

  try {
    const params = {
      limit: '250',
      // Minimum 100,000 bucks liquidity if asset is a LP token
      minLiquidity: '100000',
      // undefined means all networks
      networks: supportedNetworks,
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
      return fetchPortalsTokens(chainIds, page + 1, newTokens)
    } else {
      // No more pages, return all accumulated tokens
      console.log(`Total Portals tokens fetched for ${networks}: ${newTokens.length}`)
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

export const fetchPortalsPlatforms = async (): Promise<PlatformsById> => {
  const url = `${PORTALS_BASE_URL}/v2/platforms`

  try {
    const { data: platforms } = await axios.get<GetPlatformsResponse>(url, {
      headers: {
        Authorization: `Bearer ${getConfig().REACT_APP_PORTALS_API_KEY}`,
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

export const fetchPortalsAccount = async (
  chainId: ChainId,
  owner: string,
): Promise<Record<AssetId, TokenInfo>> => {
  const url = `${getConfig().REACT_APP_PORTALS_BASE_URL}/v2/account`

  const network = CHAIN_ID_TO_PORTALS_NETWORK[chainId]

  if (!network) throw new Error(`Unsupported chainId: ${chainId}`)

  try {
    const { data } = await axios.get<GetBalancesResponse>(url, {
      params: {
        networks: [network],
        owner,
      },
      headers: {
        Authorization: `Bearer ${getConfig().REACT_APP_PORTALS_API_KEY}`,
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
