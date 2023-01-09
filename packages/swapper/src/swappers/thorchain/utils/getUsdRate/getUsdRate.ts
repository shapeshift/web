import { adapters, AssetId } from '@shapeshiftoss/caip'
import BigNumber from 'bignumber.js'

import { SwapError, SwapErrorType } from '../../../../api'
import { bn, bnOrZero } from '../../../utils/bignumber'
import { ThornodePoolResponse } from '../../types'
import { isRune } from '../isRune/isRune'
import { thorService } from '../thorService'

const PRECISION = 18

const USD_POOLS = Object.freeze([
  'AVAX.USDC-0XB97EF9EF8734C71904D8002F8B6BC66DD9C48A6E',
  'BNB.BUSD-BD1',
  'ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48',
  'ETH.USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7',
])

// calculate rune usd price from a usd pool (ex. USDC_POOL)
const getRuneUsdPrice = async (daemonUrl: string): Promise<BigNumber> => {
  const { data } = await thorService.get<ThornodePoolResponse[]>(`${daemonUrl}/lcd/thorchain/pools`)

  const availableUsdPools = data.filter(
    (pool) => pool.status === 'Available' && USD_POOLS.includes(pool.asset),
  )

  const { aggregatedRuneUsdPrice, numPools } = availableUsdPools.reduce(
    (prev, pool) => {
      const usdBalance = bnOrZero(pool.balance_asset)
      const runeBalance = bnOrZero(pool.balance_rune)

      if (usdBalance.isZero() || runeBalance.isZero()) return prev

      // usdBalance / runeBalance = runeUsdPrice
      const runeUsdPrice = usdBalance.div(runeBalance)

      prev.aggregatedRuneUsdPrice = prev.aggregatedRuneUsdPrice.plus(runeUsdPrice)
      prev.numPools++

      return prev
    },
    { aggregatedRuneUsdPrice: bn(0), numPools: 0 },
  )

  if (!numPools) {
    throw new SwapError('[getUsdRate]: no available usd pools', {
      code: SwapErrorType.USD_RATE_FAILED,
    })
  }

  // aggregatedRuneUsdPrice / numPools = averageRuneUsdPrice
  return aggregatedRuneUsdPrice.div(numPools)
}

export const getUsdRate = async (daemonUrl: string, assetId: AssetId): Promise<string> => {
  try {
    if (isRune(assetId)) {
      const runeUsdPrice = await getRuneUsdPrice(daemonUrl)
      return runeUsdPrice.toFixed(PRECISION)
    }

    const poolId = adapters.assetIdToPoolAssetId({ assetId })
    if (!poolId) {
      throw new SwapError(`[getUsdRate]: no pool found for assetId: ${assetId}`, {
        code: SwapErrorType.USD_RATE_FAILED,
      })
    }

    const { data } = await thorService.get<ThornodePoolResponse>(
      `${daemonUrl}/lcd/thorchain/pool/${poolId}`,
    )

    if (data.status !== 'Available') {
      throw new SwapError('[getUsdRate]: pool is no longer available', {
        code: SwapErrorType.USD_RATE_FAILED,
      })
    }

    const assetBalance = bnOrZero(data.balance_asset)
    const runeBalance = bnOrZero(data.balance_rune)

    if (assetBalance.isZero() || runeBalance.isZero()) {
      throw new SwapError('[getUsdRate]: pool has a zero balance', {
        code: SwapErrorType.USD_RATE_FAILED,
      })
    }

    const runeUsdPrice = await getRuneUsdPrice(daemonUrl)

    // runeBalance / assetBalance = assetPriceInRune
    const assetPriceInRune = runeBalance.div(assetBalance)

    // runeUsdPrice * assetPriceInRune = assetUsdPrice
    return runeUsdPrice.times(assetPriceInRune).toFixed(PRECISION)
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[getUsdRate]: Thorchain getUsdRate failed', {
      code: SwapErrorType.USD_RATE_FAILED,
      cause: e,
    })
  }
}
