import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, osmosisChainId, toAssetId } from '@shapeshiftoss/caip'
import axios from 'axios'
import { getConfig } from 'config'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'

type OsmosisToken = {
  denom: string
  amount: string
}

type OsmosisPoolAsset = {
  token: OsmosisToken
  weight: string
}

type OsmosisPool = {
  '@type': string
  name: string
  address: string
  id: string
  pool_params: {
    swap_fee: string
    exit_fee: string
    smooth_weight_change_params: boolean
  }
  future_pool_governor: string
  total_shares: {
    denom: string
    amount: string
  }
  pool_assets: OsmosisPoolAsset[]
  total_weight: string
  apy: string
  tvl: string
}

type OsmosisBasePool = Omit<OsmosisPool, 'apy' | 'tvl' | 'underlyingAssets'>

type OsmosisPoolList = {
  pools: OsmosisBasePool[]
  pagination: {
    next_key: string | null
    total: string
  }
}

type PoolHistoricalData = {
  symbol: string
  amount: number
  denom: string
  coingecko_id: string
  liquidity: number
  liquidity_24h_change: number
  volume_24h: number
  volume_24h_change: number
  volume_7d: number
  price: number
  fees: string
  main: boolean
}

type PoolHistoricalDataList = {
  [key: string]: PoolHistoricalData[]
}

const moduleLogger = logger.child({
  namespace: ['opportunitySlice', 'resolvers', 'osmosis', 'utils'],
})

/** Somehow, the v1beta1/pools API call returns some (~12/886) objects of a type that doesn't conform
 * to the type defined above (missing certain fields and containing others.)
 * This type guard is used to filter out the invalid pools records. */
const isOsmosisBasePool = (pool: any): pool is OsmosisBasePool => {
  return (
    pool.hasOwnProperty('@type') &&
    pool.hasOwnProperty('address') &&
    pool.hasOwnProperty('id') &&
    pool.hasOwnProperty('pool_params') &&
    !pool.hasOwnProperty('pool_liquidity') &&
    pool.hasOwnProperty('future_pool_governor') &&
    pool.hasOwnProperty('total_shares') &&
    pool.hasOwnProperty('pool_assets') &&
    pool.hasOwnProperty('total_weight')
  )
}

export const generateAssetIdFromOsmosisDenom = (denom: string): AssetId => {
  if (denom.startsWith('u') && denom !== 'uosmo') {
    return toAssetId({
      assetNamespace: 'native' as const,
      assetReference: denom,
      chainId: osmosisChainId,
    })
  }

  if (denom.startsWith('ibc')) {
    return toAssetId({
      assetNamespace: 'ibc' as const,
      assetReference: denom.split('/')[1],
      chainId: osmosisChainId,
    })
  }

  return toAssetId({
    assetNamespace: 'slip44' as const,
    assetReference: ASSET_REFERENCE.Osmosis,
    chainId: osmosisChainId,
  })
}

export const getPools = async (): Promise<OsmosisPool[]> => {
  try {
    /**
     * TODO: Use axios cache layer with reasonable (30s-5m) max age to save responses between calls.
     * At app startup, these requests are made ~10 times with the same data returned each time.
     */

    /* Fetch Osmosis pool data */
    const { data: poolData } = await axios.get<OsmosisPoolList>(
      (() => {
        const url = new URL('gamm/v1beta1/pools', getConfig().REACT_APP_OSMOSIS_LCD_BASE_URL)
        url.searchParams.set(
          'pagination.limit',
          getConfig().REACT_APP_OSMOSIS_POOL_PAGINATION_LIMIT.toString(),
        )
        return url.toString()
      })(),
    )

    if (!poolData) throw new Error('Unable to fetch Osmosis liquidity pool metadata')

    /* Fetch historical data for Osmosis pools */
    const { data: historicalDataByPoolId } = await axios.get<PoolHistoricalDataList>(
      (() => {
        const url = new URL('pools/v2/all', getConfig().REACT_APP_OSMOSIS_IMPERATOR_BASE_URL)
        url.searchParams.set(
          'low_liquidity',
          getConfig().REACT_APP_OSMOSIS_ALLOW_LOW_LIQUIDITY_POOLS.toString(),
        )
        return url.toString()
      })(),
    )

    if (!historicalDataByPoolId)
      throw new Error('Unable to fetch historical data for Osmosis liquidity pools')

    const getPoolTVL = (pool: OsmosisBasePool): string => {
      const marketData = historicalDataByPoolId[pool.id]
      return bnOrZero(marketData[0].liquidity).toString()
    }

    const calculatePoolAPY = (pool: OsmosisBasePool): string => {
      const poolHistoricalData = historicalDataByPoolId[pool.id][0] // Identical pool-level historical data exists on both asset entries

      /* Pool fee data is represented in API response like '0.2%'. */
      const feeMultiplier = bnOrZero(poolHistoricalData.fees.split('%')[0]).multipliedBy(
        bnOrZero(0.01),
      )
      const feesSpent7d = bnOrZero(poolHistoricalData.volume_7d).multipliedBy(feeMultiplier)
      const averageDailyFeeRevenue = feesSpent7d.dividedBy(bnOrZero(7))
      const annualRevenue = averageDailyFeeRevenue.multipliedBy(bnOrZero(365))
      const poolTVL = bnOrZero(getPoolTVL(pool))

      if (poolTVL.eq(0) || annualRevenue.eq(0)) return bnOrZero(0).toString() // TODO: Handle error properly

      return annualRevenue.dividedBy(poolTVL).toString()
    }

    const getPoolName = (pool: OsmosisBasePool): string => {
      const poolHistoricalData = historicalDataByPoolId[pool.id]
      return `Osmosis ${poolHistoricalData[0].symbol}/${poolHistoricalData[1].symbol} Liquidity Pool`
    }

    /** Since we may choose to filter out pools with low liquidity in the historical data query above,
     * the pool data array could contain more entries than the historical data array.
     * We use a Set here to keep track of which pools we have historical data for so that
     * we can quickly filter the poolData array below.
     */
    const keys = Object.keys(historicalDataByPoolId)
    const poolsWithAvailableHistoricalData = new Set(keys)

    return poolData.pools
      .filter(pool => isOsmosisBasePool(pool) && poolsWithAvailableHistoricalData.has(pool.id))
      .map<OsmosisPool>(pool => {
        return {
          ...pool,
          name: getPoolName(pool),
          apy: calculatePoolAPY(pool),
          tvl: getPoolTVL(pool),
        }
      })
  } catch (error) {
    moduleLogger.error({ fn: 'getPools', error }, `Error fetching Osmosis pools`)
    return []
  }
}
