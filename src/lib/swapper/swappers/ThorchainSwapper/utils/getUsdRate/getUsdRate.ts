import type { AssetId } from '@shapeshiftoss/caip'
import { adapters } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type BigNumber from 'bignumber.js'
import type { BN } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import type { ThornodePoolResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { isRune } from 'lib/swapper/swappers/ThorchainSwapper/utils/isRune/isRune'
import { thorService } from 'lib/swapper/swappers/ThorchainSwapper/utils/thorService'

const PRECISION = 18

const USD_POOLS = Object.freeze([
  'AVAX.USDC-0XB97EF9EF8734C71904D8002F8B6BC66DD9C48A6E',
  'BNB.BUSD-BD1',
  'ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48',
  'ETH.USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7',
])

// calculate rune usd price from a usd pool (ex. USDC_POOL)
const getRuneUsdPrice = async (daemonUrl: string): Promise<Result<BigNumber, SwapErrorRight>> => {
  return (await thorService.get<ThornodePoolResponse[]>(`${daemonUrl}/lcd/thorchain/pools`))
    .map(thorPoolsResponse => {
      const { data } = thorPoolsResponse
      const availableUsdPools = data.filter(
        pool => pool.status === 'Available' && USD_POOLS.includes(pool.asset),
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

      return { aggregatedRuneUsdPrice, numPools }
    })
    .andThen<BN>(({ aggregatedRuneUsdPrice, numPools }) => {
      if (!numPools) {
        return Err(
          makeSwapErrorRight({
            message: '[getUsdRate]: no available usd pools',
            code: SwapErrorType.USD_RATE_FAILED,
          }),
        )
      }

      // aggregatedRuneUsdPrice / numPools = averageRuneUsdPrice
      return Ok(aggregatedRuneUsdPrice.div(numPools))
    })
}

export const getUsdRate = async (
  daemonUrl: string,
  assetId: AssetId,
): Promise<Result<string, SwapErrorRight>> => {
  if (isRune(assetId)) {
    const maybeRuneUsdPrice = await getRuneUsdPrice(daemonUrl)
    return maybeRuneUsdPrice.andThen(runeUsdPrice => Ok(runeUsdPrice.toFixed(PRECISION)))
  }

  const poolId = adapters.assetIdToPoolAssetId({ assetId })
  if (!poolId) {
    return Err(
      makeSwapErrorRight({
        message: `[getUsdRate]: no pool found for assetId: ${assetId}`,
        code: SwapErrorType.USD_RATE_FAILED,
      }),
    )
  }

  const maybeThorNodePoolResponse = await thorService.get<ThornodePoolResponse>(
    `${daemonUrl}/lcd/thorchain/pool/${poolId}`,
  )

  if (maybeThorNodePoolResponse.isErr()) return Err(maybeThorNodePoolResponse.unwrapErr())

  const { data } = maybeThorNodePoolResponse.unwrap()

  if (data.status !== 'Available') {
    return Err(
      makeSwapErrorRight({
        message: '[getUsdRate]: pool is no longer available',
        code: SwapErrorType.USD_RATE_FAILED,
      }),
    )
  }

  const assetBalance = bnOrZero(data.balance_asset)
  const runeBalance = bnOrZero(data.balance_rune)

  if (assetBalance.isZero() || runeBalance.isZero()) {
    return Err(
      makeSwapErrorRight({
        message: '[getUsdRate]: pool has a zero balance',
        code: SwapErrorType.USD_RATE_FAILED,
      }),
    )
  }

  const maybeRuneUsdPrice = await getRuneUsdPrice(daemonUrl)

  return maybeRuneUsdPrice.andThen(runeUsdPrice => {
    // runeBalance / assetBalance = assetPriceInRune
    const assetPriceInRune = runeBalance.div(assetBalance)

    // runeUsdPrice * assetPriceInRune = assetUsdPrice
    return Ok(runeUsdPrice.times(assetPriceInRune).toFixed(PRECISION))
  })
}
