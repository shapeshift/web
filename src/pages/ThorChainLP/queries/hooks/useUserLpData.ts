import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import type { UseQueryResult } from '@tanstack/react-query'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { reactQueries } from 'react-queries'
import { bn } from 'lib/bignumber/bignumber'
import { isSome } from 'lib/utils'
import { calculatePoolOwnershipPercentage, getCurrentValue } from 'lib/utils/thorchain/lp'
import type { Position, UserLpDataPosition } from 'lib/utils/thorchain/lp/types'
import { AsymSide } from 'lib/utils/thorchain/lp/types'
import { selectMarketDataById } from 'state/slices/marketDataSlice/selectors'
import { selectAccountIdsByAssetId, selectWalletId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type UseUserLpDataProps = {
  assetId: AssetId
  accountId?: AccountId
}

export const useUserLpData = ({
  assetId,
  accountId,
}: UseUserLpDataProps): UseQueryResult<UserLpDataPosition[] | null> => {
  const queryClient = useQueryClient()
  const thorchainAccountIds = useAppSelector(state =>
    selectAccountIdsByAssetId(state, { assetId: thorchainAssetId }),
  )
  const assetAccountIds = useAppSelector(state => selectAccountIdsByAssetId(state, { assetId }))
  const accountIds = [...(accountId ? [accountId] : assetAccountIds), ...thorchainAccountIds]

  const poolAssetMarketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const runeMarketData = useAppSelector(state => selectMarketDataById(state, thorchainAssetId))

  const { data: thornodePoolData } = useQuery({
    ...reactQueries.thornode.poolData(assetId),
    // @lukemorales/query-key-factory only returns queryFn and queryKey - all others will be ignored in the returned object
    // 0 seconds garbage collect and stale times since this is used to get the current position value, we want this to always be cached-then-fresh
    staleTime: 0,
    gcTime: 0,
    enabled: !!assetId,
  })

  const { data: midgardPoolData } = useQuery({
    ...reactQueries.midgard.poolData(assetId),
    // @lukemorales/query-key-factory only returns queryFn and queryKey - all others will be ignored in the returned object
    // 0 seconds garbage collect and stale times since this is used to get the current position value, we want this to always be cached-then-fresh
    staleTime: 0,
    gcTime: 0,
  })

  const selectLiquidityPositionsData = (positions: Position[] | undefined) => {
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

  const currentWalletId = useAppSelector(selectWalletId)
  const liquidityPoolPositionData = useQuery({
    ...reactQueries.thorchainLp.userLpData(assetId, currentWalletId),
    // 60 seconds staleTime since this is used to get the current position value
    staleTime: 60_000,
    queryFn: async ({ queryKey }) => {
      const [, , , { assetId }] = queryKey

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
    enabled: Boolean(assetId && currentWalletId && thornodePoolData),
  })

  return liquidityPoolPositionData
}
