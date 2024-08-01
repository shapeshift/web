import type { ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, bscChainId, toAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import axios from 'axios'
import qs from 'qs'
import { getAddress, isAddressEqual, zeroAddress } from 'viem'
import { CHAIN_ID_TO_PORTALS_NETWORK } from 'lib/market-service/portals/constants'
import type { GetTokensResponse, TokenInfo } from 'lib/market-service/portals/types'

import { colorMap } from '../colorMap'
import { createThrottle } from '.'

export const fetchPortalsTokens = async (
  chainId: ChainId,
  page: number = 0,
  accTokens: TokenInfo[] = [],
): Promise<TokenInfo[]> => {
  console.log(`Fetching page ${page} of Portals tokens for chainId: ${chainId}`)
  const url = 'https://api.portals.fi/v2/tokens'
  const PORTALS_API_KEY = process.env.REACT_APP_PORTALS_API_KEY

  const { throttle, clear } = createThrottle({
    capacity: 500, // 500 rpm as per https://github.com/shapeshift/web/pull/7401#discussion_r1687499650
    costPerReq: 1,
    drainPerInterval: 125, // Replenish 25 requests every 15 seconds
    intervalMs: 15000, // 15 seconds
  })
  if (!PORTALS_API_KEY) throw new Error('REACT_APP_PORTALS_API_KEY not set')

  const network = CHAIN_ID_TO_PORTALS_NETWORK[chainId]

  try {
    if (!network) throw new Error(`Unsupported chainId: ${chainId}`)

    const params = {
      limit: '250',
      // Minimum 1000 bucks liquidity if asset is a LP token
      minLiquidity: '1000',
      // Minimum 1% APY if asset is a LP token
      minApy: '1',
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

export const getPortalTokens = async (nativeAsset: Asset): Promise<Asset[]> => {
  const chainId = nativeAsset.chainId
  const explorerData = {
    explorer: nativeAsset.explorer,
    explorerAddressLink: nativeAsset.explorerAddressLink,
    explorerTxLink: nativeAsset.explorerTxLink,
  }

  const portalsTokens = await fetchPortalsTokens(chainId)
  return portalsTokens.map(token => {
    const assetId = toAssetId({
      chainId,
      assetNamespace: chainId === bscChainId ? ASSET_NAMESPACE.bep20 : ASSET_NAMESPACE.erc20,
      assetReference: token.address,
    })
    return {
      ...explorerData,
      color: colorMap[assetId] ?? '#FFFFFF',
      icon: token.images?.[0],
      ...(token.images?.length && { icons: token.images }),
      name: token.name,
      precision: Number(token.decimals),
      symbol: token.symbol,
      chainId: nativeAsset.chainId,
      assetId,
      relatedAssetKey: undefined,
    }
  })
}
