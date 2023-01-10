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

const moduleLogger = logger.child({ namespace: ['opportunities', 'resolvers', 'osmosis', 'utils'] })

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
    const { data: poolData } = await axios.get<OsmosisPoolList>(
      `${getConfig().REACT_APP_OSMOSIS_LCD_BASE_URL}gamm/v1beta1/pools?pagination.limit=1000`,
    )
    if (!poolData) throw new Error('Unable to fetch Osmosis liquidity pool metadata')

    const { data: historicalDataByPoolId } = await axios.get<PoolHistoricalDataList>(
      `${getConfig().REACT_APP_OSMOSIS_IMPERATOR_BASE_URL}pools/v2/all?low_liquidity=false`,
    )
    if (!historicalDataByPoolId)
      throw new Error('Unable to fetch historical data for Osmosis liquidity pools')

    const osmoHistoricalData = historicalDataByPoolId['1'].find(x => x.symbol === 'OSMO')
    if (!osmoHistoricalData) throw new Error('Unable to find historical data for $OSMO')

    //TODO: Properly handle cases where any of the above assignments fail

    const getPoolTVL = (pool: OsmosisBasePool): string => {
      const marketData = historicalDataByPoolId[pool.id]

      return bnOrZero(marketData[0].liquidity).toString()
    }

    const calculatePoolAPY = (pool: OsmosisBasePool): string => {
      const poolHistoricalData = historicalDataByPoolId[pool.id][0] // Identical pool-level historical data exists on both asset entries
      const feeMultiplier = bnOrZero(poolHistoricalData.fees.split('%')[0]).multipliedBy(
        bnOrZero(0.01),
      )
      const feesSpent7d = bnOrZero(poolHistoricalData.volume_7d).multipliedBy(feeMultiplier)
      const averageDailyFeeRevenue = feesSpent7d.dividedBy(bnOrZero(7))
      const annualRevenue = averageDailyFeeRevenue.multipliedBy(bnOrZero(365))
      const poolTVL = bnOrZero(getPoolTVL(pool))

      if (poolTVL.eq(0) || annualRevenue.eq(0)) return bnOrZero(0).toString() // TODO: Handle error properly

      return annualRevenue.dividedBy(poolTVL).multipliedBy(100).toFixed(0).toString()
    }

    const getPoolName = (pool: OsmosisBasePool): string => {
      const poolHistoricalData = historicalDataByPoolId[pool.id]
      return `Osmosis ${poolHistoricalData[0].symbol}/${poolHistoricalData[1].symbol} Liquidity Pool`
    }

    return poolData.pools.map(pool => {
      return {
        ...pool,
        name: getPoolName(pool),
        apy: calculatePoolAPY(pool),
        tvl: getPoolTVL(pool),
      }
    })
  } catch (error) {
    moduleLogger.debug({ fn: 'getPools', error }, `Error fetching Osmosis pools`)
    // TODO: handle this properly
    throw new Error('OsmosisSdk::getPools: error fetching pool data')
  }
}
