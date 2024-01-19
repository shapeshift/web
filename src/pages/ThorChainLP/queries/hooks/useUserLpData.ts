import type { AccountId } from '@shapeshiftoss/caip'
import { type AssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import type { UseQueryResult } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { reactQueries } from 'react-queries'
import { queryClient } from 'context/QueryClientProvider/queryClient'
import { bn } from 'lib/bignumber/bignumber'
import { isSome } from 'lib/utils'
import { calculatePoolOwnershipPercentage, getCurrentValue } from 'lib/utils/thorchain/lp'
import type { MidgardPool, UserLpDataPosition } from 'lib/utils/thorchain/lp/types'
import { AsymSide } from 'lib/utils/thorchain/lp/types'
import { selectMarketDataById } from 'state/slices/marketDataSlice/selectors'
import { selectAccountIdsByAssetId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type UseUserLpDataProps = {
  assetId: AssetId
}

export const useUserLpData = ({
  assetId,
}: UseUserLpDataProps): UseQueryResult<UserLpDataPosition[] | null> => {
  const thorchainAccountIds = useAppSelector(state =>
    selectAccountIdsByAssetId(state, { assetId: thorchainAssetId }),
  )
  const accountIds = [
    ...useAppSelector(state => selectAccountIdsByAssetId(state, { assetId })),
    ...thorchainAccountIds,
  ]

  const lpPositionQueryKey: [string, { assetId: AssetId }] = useMemo(
    () => ['thorchainUserLpData', { assetId }],
    [assetId],
  )

  const poolAssetMarketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const runeMarketData = useAppSelector(state => selectMarketDataById(state, thorchainAssetId))

  const { data: thornodePoolData } = useQuery({
    ...reactQueries.thornode.poolData(assetId),
  })

  const { data: midgardPoolData } = useQuery({
    ...reactQueries.midgard.poolData(assetId),
  })

  const selectLiquidityPositionsData = (
    positions:
      | (MidgardPool & {
          accountId: AccountId
        })[]
      | undefined,
  ) => {
    if (!positions || !thornodePoolData || !midgardPoolData) return null

    const parsedPositions = positions.map(position => {
      const currentValue = getCurrentValue(
        position.liquidityUnits,
        thornodePoolData.pool_units,
        midgardPoolData.assetDepth,
        midgardPoolData.runeDepth,
      )

      const underlyingAssetValueFiatUserCurrency = bn(currentValue.asset).times(
        poolAssetMarketData?.price || 0,
      )
      const underlyingRuneValueFiatUserCurrency = bn(currentValue.rune).times(
        runeMarketData?.price || 0,
      )

      const isAsymmetric = position.runeAddress === '' || position.assetAddress === ''
      const asymSide = (() => {
        if (position.runeAddress === '') return AsymSide.Asset
        if (position.assetAddress === '') return AsymSide.Rune
        return null
      })()

      const totalValueFiatUserCurrency = underlyingAssetValueFiatUserCurrency
        .plus(underlyingRuneValueFiatUserCurrency)
        .toFixed()

      const poolOwnershipPercentage = calculatePoolOwnershipPercentage({
        userLiquidityUnits: position.liquidityUnits,
        totalPoolUnits: thornodePoolData.pool_units,
      })

      return {
        dateFirstAdded: position.dateFirstAdded,
        liquidityUnits: position.liquidityUnits,
        underlyingAssetAmountCryptoPrecision: currentValue.asset,
        underlyingRuneAmountCryptoPrecision: currentValue.rune,
        isAsymmetric,
        asymSide: isAsymmetric ? asymSide : null,
        underlyingAssetValueFiatUserCurrency: underlyingAssetValueFiatUserCurrency.toFixed(),
        underlyingRuneValueFiatUserCurrency: underlyingRuneValueFiatUserCurrency.toFixed(),
        totalValueFiatUserCurrency,
        poolOwnershipPercentage,
        opportunityId: `${assetId}*${asymSide ?? 'sym'}`,
        poolShare: currentValue.poolShare,
        accountId: position.accountId,
        assetId,
        runeAddress: position.runeAddress,
        assetAddress: position.assetAddress,
      }
    })

    return parsedPositions
  }

  // TODO(gomes): this is dumb and not really the way to use react-query - this is really just mapping over positions as queries and running a selector.
  // We may want to run the queries themselves with `useQueries` and then map over the results with a `useMemo`
  const liquidityPoolPositionData = useQuery({
    queryKey: lpPositionQueryKey,
    staleTime: Infinity,
    queryFn: async ({ queryKey }) => {
      const [, { assetId }] = queryKey

      const allPositions = (
        await Promise.all(
          accountIds.map(accountId =>
            queryClient.fetchQuery(
              reactQueries.thorchainLp.liquidityProviderPosition({ accountId, assetId }),
            ),
          ),
        )
      )
        .flat()
        .filter(isSome)

      return allPositions.length ? allPositions : []
    },
    select: selectLiquidityPositionsData,
    enabled: Boolean(assetId && thornodePoolData),
  })

  return liquidityPoolPositionData
}
