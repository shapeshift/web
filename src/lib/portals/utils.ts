import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, bscChainId, toAssetId } from '@shapeshiftoss/caip'
import axios from 'axios'
import { getConfig } from 'config'
import { CHAIN_ID_TO_PORTALS_NETWORK } from 'lib/market-service/portals/constants'
import type {
  GetBalancesResponse,
  GetPlatformsResponse,
  PlatformsById,
  TokenInfo,
} from 'lib/market-service/portals/types'

export const fetchPortalsPlatforms = async (): Promise<PlatformsById> => {
  const url = `${getConfig().REACT_APP_PORTALS_BASE_URL}/v2/platforms`

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
