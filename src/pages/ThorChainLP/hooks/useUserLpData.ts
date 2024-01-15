import type { AccountId } from '@shapeshiftoss/caip'
import { type AssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import type { UseQueryResult } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { getConfig } from 'config'
import { useMemo } from 'react'
import { bn } from 'lib/bignumber/bignumber'
import type {
  MidgardPoolResponse,
  ThornodePoolResponse,
} from 'lib/swapper/swappers/ThorchainSwapper/types'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { isSome } from 'lib/utils'
import { getCurrentValue, getThorchainLiquidityProviderPosition } from 'lib/utils/thorchain/lp'
import type { MidgardPool } from 'lib/utils/thorchain/lp/types'
import { selectMarketDataById } from 'state/slices/marketDataSlice/selectors'
import { selectAccountIdsByAssetId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type UseUserLpDataProps = {
  assetId: AssetId
}

const calculatePoolOwnershipPercentage = ({
  userLiquidityUnits,
  totalPoolUnits,
}: {
  userLiquidityUnits: string
  totalPoolUnits: string
}): string => bn(userLiquidityUnits).div(totalPoolUnits).times(100).toFixed()

export enum AsymSide {
  Asset = 'asset',
  Rune = 'rune',
}

type UseUserLpDataReturn = {
  underlyingAssetAmountCryptoPrecision: string
  underlyingRuneAmountCryptoPrecision: string
  isAsymmetric: boolean
  asymSide: AsymSide | null
  underlyingAssetValueFiatUserCurrency: string
  underlyingRuneValueFiatUserCurrency: string
  totalValueFiatUserCurrency: string
  poolOwnershipPercentage: string
  opportunityId: string
  redeemableFees: {
    asset: string
    rune: string
  }
  accountId: AccountId
  assetId: AssetId
}[]

export const useUserLpData = ({
  assetId,
}: UseUserLpDataProps): UseQueryResult<UseUserLpDataReturn | null> => {
  const accountIds = useAppSelector(state => selectAccountIdsByAssetId(state, { assetId }))
  const lpPositionQueryKey: [string, { assetId: AssetId }] = useMemo(
    () => ['thorchainUserLpData', { assetId }],
    [assetId],
  )

  const poolAssetMarketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const runeMarketData = useAppSelector(state => selectMarketDataById(state, thorchainAssetId))

  const { data: thornodePoolData } = useQuery({
    queryKey: ['thornodePoolData', assetId],
    queryFn: async () => {
      const poolAssetId = assetIdToPoolAssetId({ assetId })
      const { data: poolData } = await axios.get<ThornodePoolResponse>(
        `${getConfig().REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/pool/${poolAssetId}`,
      )

      return poolData
    },
  })

  const { data: midgardPoolData } = useQuery({
    queryKey: ['midgardPoolData', assetId],
    queryFn: async () => {
      const poolAssetId = assetIdToPoolAssetId({ assetId })
      const { data: poolData } = await axios.get<MidgardPoolResponse>(
        `${getConfig().REACT_APP_MIDGARD_URL}/pool/${poolAssetId}`,
      )

      return poolData
    },
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
        underlyingAssetAmountCryptoPrecision: currentValue.asset,
        underlyingRuneAmountCryptoPrecision: currentValue.rune,
        isAsymmetric,
        asymSide: isAsymmetric ? asymSide : null,
        underlyingAssetValueFiatUserCurrency: underlyingAssetValueFiatUserCurrency.toFixed(),
        underlyingRuneValueFiatUserCurrency: underlyingRuneValueFiatUserCurrency.toFixed(),
        totalValueFiatUserCurrency,
        poolOwnershipPercentage,
        opportunityId: `${assetId}*${asymSide ?? 'sym'}`,
        redeemableFees: currentValue, // TODO(gomes): FIXME, dis wrong
        accountId: position.accountId,
        assetId,
      }
    })

    return parsedPositions
  }

  const liquidityPoolPositionData = useQuery({
    queryKey: lpPositionQueryKey,
    staleTime: Infinity,
    queryFn: async ({ queryKey }) => {
      const [, { assetId }] = queryKey

      const allPositions = (
        await Promise.all(
          accountIds.map(accountId =>
            getThorchainLiquidityProviderPosition({ accountId, assetId }),
          ),
        )
      )
        .flat()
        .filter(isSome)

      if (!allPositions.length) return

      return allPositions
    },
    select: selectLiquidityPositionsData,
    enabled: Boolean(assetId && thornodePoolData),
  })

  return liquidityPoolPositionData
}
