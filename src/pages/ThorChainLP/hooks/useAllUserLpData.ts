import { type AccountId, type AssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import type { UseQueryResult } from '@tanstack/react-query'
import { useQueries } from '@tanstack/react-query'
import axios from 'axios'
import { getConfig } from 'config'
import { bn } from 'lib/bignumber/bignumber'
import type {
  MidgardPoolResponse,
  ThornodePoolResponse,
} from 'lib/swapper/swappers/ThorchainSwapper/types'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { getCurrentValue, getThorchainLiquidityProviderPosition } from 'lib/utils/thorchain/lp'
import type { MidgardPool } from 'lib/utils/thorchain/lp/types'
import { defaultMarketData } from 'state/slices/marketDataSlice/marketDataSlice'
import { findAccountsByAssetId } from 'state/slices/portfolioSlice/utils'
import {
  selectMarketDataById,
  selectPortfolioAccounts,
  selectSelectedCurrencyMarketDataSortedByMarketCap,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export enum AsymSide {
  Asset = 'asset',
  Rune = 'rune',
}

type UseUserLpDataReturn = {
  assetId: AssetId
  positions: {
    dateFirstAdded: string
    liquidityUnits: string
    underlyingAssetAmountCryptoPrecision: string
    underlyingRuneAmountCryptoPrecision: string
    isAsymmetric: boolean
    asymSide: AsymSide | null
    underlyingAssetValueFiatUserCurrency: string
    underlyingRuneValueFiatUserCurrency: string
    totalValueFiatUserCurrency: string
    poolOwnershipPercentage: string
    opportunityId: string
    poolShare: string
    accountId: AccountId
    assetId: AssetId
  }[]
}

const calculatePoolOwnershipPercentage = ({
  userLiquidityUnits,
  totalPoolUnits,
}: {
  userLiquidityUnits: string
  totalPoolUnits: string
}): string => bn(userLiquidityUnits).div(totalPoolUnits).times(100).toFixed()

export const useAllUserLpData = ({
  assetIds,
}: {
  assetIds: AssetId[]
}): UseQueryResult<UseUserLpDataReturn | null>[] => {
  const portfolioAccounts = useAppSelector(selectPortfolioAccounts)
  const marketData = useAppSelector(selectSelectedCurrencyMarketDataSortedByMarketCap)
  const runeMarketData = useAppSelector(state => selectMarketDataById(state, thorchainAssetId))

  const poolDataQueries = useQueries({
    queries: assetIds.map(assetId => ({
      queryKey: ['thornodePoolData', assetId],
      queryFn: async () => {
        const poolAssetId = assetIdToPoolAssetId({ assetId })
        const { data: poolData } = await axios.get<ThornodePoolResponse>(
          `${getConfig().REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/pool/${poolAssetId}`,
        )
        return poolData
      },
    })),
  })

  const midgardPoolDataQueries = useQueries({
    queries: assetIds.map(assetId => ({
      queryKey: ['midgardPoolData', assetId],
      queryFn: async () => {
        const poolAssetId = assetIdToPoolAssetId({ assetId })
        const { data: poolData } = await axios.get<MidgardPoolResponse>(
          `${getConfig().REACT_APP_MIDGARD_URL}/pool/${poolAssetId}`,
        )
        return poolData
      },
    })),
  })

  const userLpDataQueries = useQueries({
    queries: assetIds.map(assetId => ({
      queryKey: ['thorchainUserLpData', { assetId }],
      queryFn: async () => {
        const accountIds = findAccountsByAssetId(portfolioAccounts, assetId)
        const allPositions = (
          await Promise.all(
            accountIds.map(accountId =>
              getThorchainLiquidityProviderPosition({ accountId, assetId }),
            ),
          )
        )
          .flat()
          .filter(Boolean)

        return allPositions
      },
      select: (
        positions:
          | (MidgardPool & {
              accountId: AccountId
            })[]
          | undefined,
      ) => {
        return {
          assetId,
          positions: (positions ?? []).map(position => {
            if (!assetId) return null

            const thornodePoolData = poolDataQueries.find(
              query => query.data?.asset === position.pool,
            )?.data
            const midgardPoolData = midgardPoolDataQueries.find(
              query => query.data?.asset === position.pool,
            )?.data

            if (!thornodePoolData || !midgardPoolData) return null

            const currentValue = getCurrentValue(
              position.liquidityUnits,
              thornodePoolData.pool_units,
              midgardPoolData.assetDepth,
              midgardPoolData.runeDepth,
            )

            const poolAssetMarketData = marketData[assetId] ?? defaultMarketData

            const isAsymmetric = position.runeAddress === '' || position.assetAddress === ''
            const asymSide = (() => {
              if (position.runeAddress === '') return AsymSide.Asset
              if (position.assetAddress === '') return AsymSide.Rune
              return null
            })()

            return {
              dateFirstAdded: position.dateFirstAdded,
              liquidityUnits: position.liquidityUnits,
              underlyingAssetAmountCryptoPrecision: currentValue.asset,
              underlyingRuneAmountCryptoPrecision: currentValue.rune,
              isAsymmetric,
              asymSide,
              underlyingAssetValueFiatUserCurrency: bn(currentValue.asset)
                .times(poolAssetMarketData?.price || 0)
                .toFixed(),
              underlyingRuneValueFiatUserCurrency: bn(currentValue.rune)
                .times(runeMarketData?.price || 0)
                .toFixed(),
              totalValueFiatUserCurrency: bn(currentValue.asset)
                .times(poolAssetMarketData?.price || 0)
                .plus(bn(currentValue.rune).times(runeMarketData?.price || 0))
                .toFixed(),
              poolOwnershipPercentage: calculatePoolOwnershipPercentage({
                userLiquidityUnits: position.liquidityUnits,
                totalPoolUnits: thornodePoolData.pool_units,
              }),
              opportunityId: `${assetId}*${asymSide ?? 'sym'}`,
              poolShare: currentValue.poolShare,
              accountId: position.accountId,
              assetId,
            }
          }),
        }
      },
    })),
  })

  return userLpDataQueries
}
