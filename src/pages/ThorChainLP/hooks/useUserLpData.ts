import { type AccountId, type AssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fromThorBaseUnit } from 'lib/utils/thorchain'
import { getThorchainLendingPosition } from 'lib/utils/thorchain/lending'
import { getThorchainLiquidityProviderPosition } from 'lib/utils/thorchain/lp'
import { selectMarketDataById } from 'state/slices/marketDataSlice/selectors'
import { useAppSelector } from 'state/store'

type UseLendingPositionDataProps = {
  accountId: AccountId
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
  // TODO(gomes): handle UTXOs too
  // TODO(gomes): handle symmetric LP positions
  const lpPositionQueryKey: [string, { accountId: AccountId; assetId: AssetId }] = useMemo(
    () => ['thorchainUserLpData', { accountId, assetId }],
    [accountId, assetId],
  )

  const poolAssetMarketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const runeMarketData = useAppSelector(state => selectMarketDataById(state, thorchainAssetId))

  const lendingPositionData = useQuery({
    // TODO(gomes): remove me, this avoids spamming the API during development
    staleTime: Infinity,
    queryKey: lpPositionQueryKey,
    queryFn: async ({ queryKey }) => {
      const [, { accountId, assetId }] = queryKey
      const position = await getThorchainLiquidityProviderPosition({ accountId, assetId })
      return position
    },
    select: data => {
      const assetValueFiatUserCurrency = fromThorBaseUnit(data?.asset_deposit_value || '0').times(
        poolAssetMarketData?.price || 0,
      )
      const runeValueFiatUserCurrency = fromThorBaseUnit(data?.rune_deposit_value || '0').times(
        runeMarketData?.price || 0,
      )

      const totalValueFiatUserCurrency = assetValueFiatUserCurrency
        .plus(runeValueFiatUserCurrency)
        .toFixed()

      return {
        assetValueFiatUserCurrency: assetValueFiatUserCurrency.toFixed(),
        runeValueFiatUserCurrency: runeValueFiatUserCurrency.toFixed(),
        totalValueFiatUserCurrency,
      }
    },
    enabled: true,
  })

  return lendingPositionData
}
