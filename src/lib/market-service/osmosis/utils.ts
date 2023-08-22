import type { AssetReference } from '@shapeshiftoss/caip'
import axios from 'axios'

import type { OsmosisMarketData, OsmosisPool } from './osmosis-types'

export const isOsmosisLpAsset = (assetReference: AssetReference | string): boolean => {
  return assetReference.startsWith('gamm/pool/')
}

const isNumeric = (s: string) => {
  if (typeof s !== 'string') return false
  if (s.trim() === '') return false
  return !Number.isNaN(Number(s))
}

export const getPool = async (
  poolId: string,
  baseUrl: string,
): Promise<OsmosisPool | undefined> => {
  try {
    /* Fetch Osmosis pool metadata */
    if (!isNumeric(poolId)) throw new Error(`Cannot fetch pool info for invalid pool ID${poolId}`)
    const {
      data: { pool: poolData },
    } = await axios.get<{ pool: OsmosisPool }>(
      (() => {
        const url = new URL(`/lcd/osmosis/gamm/v1beta1/pools/${poolId}`, baseUrl)
        return url.toString()
      })(),
    )
    return poolData
  } catch (error) {
    console.error({ fn: 'getPool', error }, `Error fetching metadata for Osmosis pool ${poolId}`)
    return undefined
  }
}

export const getAllPools = async (baseUrl: string): Promise<OsmosisPool[] | undefined> => {
  try {
    /* Fetch metedata for all Osmosis pools */
    const { data } = await axios.get<{ pools: OsmosisPool[] }>(
      (() => {
        const url = new URL(`/lcd/osmosis/gamm/v1beta1/pools`, baseUrl)
        return url.toString()
      })(),
    )
    return data.pools
  } catch (error) {
    console.error({ fn: 'getAllPools', error }, `Error fetching metadata for Osmosis pools`)
    return undefined
  }
}

export const getPoolMarketData = async (
  poolId: string,
  baseUrl: string,
): Promise<OsmosisMarketData | undefined> => {
  try {
    /* Fetch Osmosis pool price data */
    if (poolId && !isNumeric(poolId))
      throw new Error(`Cannot fetch price info for invalid pool ID${poolId}`)
    const {
      data: [MarketData],
    } = await axios.get<OsmosisMarketData[]>(
      (() => {
        const url = new URL(`/pools/v2/${poolId}`, baseUrl)
        return url.toString()
      })(),
    )
    return MarketData
  } catch (error) {
    console.error(
      { fn: 'getPoolMarketData', error },
      `Error fetching price data for Osmosis pool ${poolId}`,
    )
    return undefined
  }
}

export const getAllPoolMarketData = async (
  baseUrl: string,
): Promise<{ [k: string]: OsmosisMarketData[] } | undefined> => {
  try {
    /* Fetch price data for all Osmosis pools */
    const { data } = await axios.get<Record<string, OsmosisMarketData[]>>(
      (() => {
        const url = new URL(`/pools/v2/all`, baseUrl)
        url.searchParams.set('low_liquidity', 'true')
        return url.toString()
      })(),
    )
    return data
  } catch (error) {
    console.error(
      { fn: 'getAllPoolMarketData', error },
      `Error fetching price data for Osmosis pools`,
    )
    return undefined
  }
}

export const getPoolIdFromAssetReference = (
  reference: AssetReference | string,
): string | undefined => {
  try {
    const segments = reference.split('/')
    if (segments.length !== 3)
      throw new Error(`Cannot get pool ID from invalid Osmosis LP asset reference ${reference}`)

    const id = segments[2]
    if (!isNumeric(id)) throw new Error(`Asset reference contains invalid pool ID ${id}`)

    return id
  } catch (error) {
    console.error({ fn: 'getPools', error }, `Error fetching data for Osmosis pool ${reference}`)
    return undefined
  }
}
