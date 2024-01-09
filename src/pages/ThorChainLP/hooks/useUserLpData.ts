import { type AccountId, type AssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { bn } from 'lib/bignumber/bignumber'
import { fromThorBaseUnit } from 'lib/utils/thorchain'
import { getThorchainLendingPosition } from 'lib/utils/thorchain/lending'
import { getThorchainLiquidityProviderPosition } from 'lib/utils/thorchain/lp'
import { selectMarketDataById } from 'state/slices/marketDataSlice/selectors'
import { useAppSelector } from 'state/store'

type UseLendingPositionDataProps = {
  accountId: AccountId | undefined
  assetId: AssetId
}

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
      return position
    },
    select: data => {
      if (!data) return null

      const underlyingAssetValueFiatUserCurrency = fromThorBaseUnit(
        data?.asset_deposit_value || '0',
      ).times(poolAssetMarketData?.price || 0)
      const underlyingRuneValueFiatUserCurrency = fromThorBaseUnit(
        data?.rune_deposit_value || '0',
      ).times(runeMarketData?.price || 0)

      // When depositing asymetrically, the assetDeposit value is the total amount deposited, but the asset_deposit_value is only half of that
      // because of the underlying rebalancing
      const isAsymmetric = data.assetDeposit !== data.asset_deposit_value
      const asymSide = bn(data.assetDeposit).gt(data.asset_deposit_value) ? 'asset' : 'rune'

      const totalValueFiatUserCurrency = underlyingAssetValueFiatUserCurrency
        .plus(underlyingRuneValueFiatUserCurrency)
        .toFixed()

      return {
        underlyingAssetAmountCryptoPrecision: fromThorBaseUnit(data.asset_deposit_value).toFixed(),
        isAsymmetric,
        asymSide: isAsymmetric ? asymSide : null,
        underlyingAssetValueFiatUserCurrency: underlyingAssetValueFiatUserCurrency.toFixed(),
        underlyingRuneValueFiatUserCurrency: underlyingRuneValueFiatUserCurrency.toFixed(),
        totalValueFiatUserCurrency,
      }
    },
    enabled: Boolean(accountId),
  })

  return lendingPositionData
}
