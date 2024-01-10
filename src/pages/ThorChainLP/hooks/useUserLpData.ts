import { type AccountId, type AssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromThorBaseUnit } from 'lib/utils/thorchain'
import { getThorchainLendingPosition } from 'lib/utils/thorchain/lending'
import { getThorchainLiquidityProviderPosition } from 'lib/utils/thorchain/lp'
import { selectMarketDataById } from 'state/slices/marketDataSlice/selectors'
import { useAppSelector } from 'state/store'

type UseLendingPositionDataProps = {
  accountId: AccountId | undefined
  assetId: AssetId
}

const calculatePoolOwnershipPercentage = ({
  userLiquidityUnits,
  totalPoolUnits,
}: {
  userLiquidityUnits: string
  totalPoolUnits: string
}): string => bn(userLiquidityUnits).div(totalPoolUnits).times(100).toFixed()

export const thorchainLendingPositionQueryFn = async ({
  queryKey,
}: {
  queryKey: [string, { accountId: AccountId; assetId: AssetId }]
}) => {
  const [, { accountId, assetId }] = queryKey
  const position = await getThorchainLendingPosition({ accountId, assetId })
  return position
}

export const useUserLpData = ({ accountId, assetId }: UseLendingPositionDataProps) => {
  // TODO(gomes): return a list of positions, and discriminate asym/sim as two different positions
  // TODO(gomes): handle symmetric LP positions - this work was started with an asymmetric position with underlying rebalancing
  const lpPositionQueryKey: [string, { accountId: AccountId | undefined; assetId: AssetId }] =
    useMemo(() => ['thorchainUserLpData', { accountId, assetId }], [accountId, assetId])

  const poolAssetMarketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const runeMarketData = useAppSelector(state => selectMarketDataById(state, thorchainAssetId))

  const lendingPositionData = useQuery({
    // TODO(gomes): remove me, this avoids spamming the API during development
    staleTime: Infinity,
    queryKey: lpPositionQueryKey,
    queryFn: async ({ queryKey }) => {
      const [, { accountId, assetId }] = queryKey

      if (!accountId) return null
      const position = await getThorchainLiquidityProviderPosition({ accountId, assetId })

      console.log({ position })

      if (!position) return null

      return position
    },
    select: data => {
      if (!data) return null

      return data.positions.map(position => {
        const underlyingAssetValueFiatUserCurrency = fromThorBaseUnit(
          position?.assetDeposit || '0',
        ).times(poolAssetMarketData?.price || 0)
        const underlyingRuneValueFiatUserCurrency = fromThorBaseUnit(
          position?.runeDeposit || '0',
        ).times(runeMarketData?.price || 0)

        const isAsymmetric = position.runeAddress === '' || position.assetAddress === ''
        const asymSide = (() => {
          if (position.runeAddress === '') return 'asset'
          if (position.assetAddress === '') return 'rune'
          return null
        })()

        const totalValueFiatUserCurrency = underlyingAssetValueFiatUserCurrency
          .plus(underlyingRuneValueFiatUserCurrency)
          .toFixed()

        const poolOwnershipPercentage = calculatePoolOwnershipPercentage({
          userLiquidityUnits: position.liquidityUnits,
          totalPoolUnits: data.poolData.pool_units,
        })

        return {
          underlyingAssetAmountCryptoPrecision: fromThorBaseUnit(position.assetDeposit).toFixed(),
          underlyingRuneAmountCryptoPrecision: fromThorBaseUnit(position.runeDeposit).toFixed(),
          isAsymmetric,
          asymSide: isAsymmetric ? asymSide : null,
          underlyingAssetValueFiatUserCurrency: underlyingAssetValueFiatUserCurrency.toFixed(),
          underlyingRuneValueFiatUserCurrency: underlyingRuneValueFiatUserCurrency.toFixed(),
          totalValueFiatUserCurrency,
          poolOwnershipPercentage,
        }
      })
    },
    enabled: Boolean(accountId),
  })

  return lendingPositionData
}
