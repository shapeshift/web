import { type AccountId, type AssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { getConfig } from 'config'
import { useMemo } from 'react'
import { bn } from 'lib/bignumber/bignumber'
import type { ThornodePoolResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { fromThorBaseUnit } from 'lib/utils/thorchain'
import { getThorchainLendingPosition } from 'lib/utils/thorchain/lending'
import { getThorchainLiquidityProviderPosition } from 'lib/utils/thorchain/lp'
import { selectMarketDataById } from 'state/slices/marketDataSlice/selectors'
import { useAppSelector } from 'state/store'

type UseLendingPositionDataProps = {
  accountId: AccountId | undefined
  assetId: AssetId
}

const calculatePoolOwnershipPercentage = (
  userLiquidityUnits: string,
  totalPoolUnits: string,
): string => bn(userLiquidityUnits).div(totalPoolUnits).times(100).toFixed()

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

      if (!position) return null

      const poolAssetId = assetIdToPoolAssetId({ assetId })
      const { REACT_APP_THORCHAIN_NODE_URL } = getConfig()

      const { data: poolData } = await axios.get<ThornodePoolResponse>(
        `${REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/pool/${poolAssetId}`,
      )
      return { position, poolData }
    },
    select: data => {
      if (!data) return null

      const { position, poolData } = data

      const underlyingAssetValueFiatUserCurrency = fromThorBaseUnit(
        position?.asset_deposit_value || '0',
      ).times(poolAssetMarketData?.price || 0)
      const underlyingRuneValueFiatUserCurrency = fromThorBaseUnit(
        position?.rune_deposit_value || '0',
      ).times(runeMarketData?.price || 0)

      // When depositing asymetrically, the assetDeposit value is the total amount deposited, but the asset_deposit_value is only half of that
      // because of the underlying rebalancing
      const isAsymmetric = position.assetDeposit !== position.asset_deposit_value
      const asymSide = bn(position.assetDeposit).gt(position.asset_deposit_value) ? 'asset' : 'rune'

      const totalValueFiatUserCurrency = underlyingAssetValueFiatUserCurrency
        .plus(underlyingRuneValueFiatUserCurrency)
        .toFixed()

      const poolOwnershipPercentage = calculatePoolOwnershipPercentage(
        position.liquidityUnits,
        poolData.pool_units,
      )

      return {
        underlyingAssetAmountCryptoPrecision: fromThorBaseUnit(
          position.asset_deposit_value,
        ).toFixed(),
        isAsymmetric,
        asymSide: isAsymmetric ? asymSide : null,
        underlyingAssetValueFiatUserCurrency: underlyingAssetValueFiatUserCurrency.toFixed(),
        underlyingRuneValueFiatUserCurrency: underlyingRuneValueFiatUserCurrency.toFixed(),
        totalValueFiatUserCurrency,
        poolOwnershipPercentage,
      }
    },
    enabled: Boolean(accountId),
  })

  return lendingPositionData
}
