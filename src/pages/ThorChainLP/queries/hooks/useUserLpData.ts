import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import type { AssetsByIdPartial } from '@shapeshiftoss/types'
import type { UseQueryResult } from '@tanstack/react-query'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { reactQueries } from 'react-queries'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { ThornodePoolResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { isSome } from 'lib/utils'
import { fromThorBaseUnit } from 'lib/utils/thorchain'
import { getPoolShare } from 'lib/utils/thorchain/lp'
import type { Position, UserLpDataPosition } from 'lib/utils/thorchain/lp/types'
import { AsymSide } from 'lib/utils/thorchain/lp/types'
import { selectMarketDataById } from 'state/slices/marketDataSlice/selectors'
import { selectAccountIdsByAssetId, selectAssets, selectWalletId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type GetPositionArgs = {
  pool: ThornodePoolResponse
  position: Position
  assets: AssetsByIdPartial
  assetId: AssetId
  assetPrice: string
  runePrice: string
}

export const getUserLpDataPosition = ({
  pool,
  position,
  assets,
  assetId,
  assetPrice,
  runePrice,
}: GetPositionArgs): UserLpDataPosition | undefined => {
  const asset = assets[assetId]
  if (!asset) return

  const rune = assets[thorchainAssetId]
  if (!rune) return

  const [asym, name] = (() => {
    if (position.runeAddress === '') return [{ side: AsymSide.Asset, asset }, asset.symbol]
    if (position.assetAddress === '') return [{ side: AsymSide.Rune, asset: rune }, rune.symbol]
    return [undefined, `${asset.symbol}/${rune.symbol}`]
  })()

  const { assetShareThorBaseUnit, runeShareThorBaseUnit, poolShareDecimalPercent } = getPoolShare(
    pool,
    bnOrZero(position.liquidityUnits),
  )

  const assetShareCryptoPrecision = fromThorBaseUnit(assetShareThorBaseUnit)
  const runeShareCryptoPrecision = fromThorBaseUnit(runeShareThorBaseUnit)

  const assetShareFiat = assetShareCryptoPrecision.times(assetPrice)
  const runeShareFiat = runeShareCryptoPrecision.times(runePrice)

  return {
    name,
    dateFirstAdded: position.dateFirstAdded,
    liquidityUnits: position.liquidityUnits,
    underlyingAssetAmountCryptoPrecision: assetShareCryptoPrecision.toFixed(),
    underlyingRuneAmountCryptoPrecision: runeShareCryptoPrecision.toFixed(),
    asym,
    underlyingAssetValueFiatUserCurrency: assetShareFiat.toFixed(),
    underlyingRuneValueFiatUserCurrency: runeShareFiat.toFixed(),
    totalValueFiatUserCurrency: assetShareFiat.plus(runeShareFiat).toFixed(),
    poolOwnershipPercentage: bn(poolShareDecimalPercent).times(100).toFixed(),
    opportunityId: `${assetId}*${asym?.side ?? 'sym'}`,
    poolShare: poolShareDecimalPercent,
    accountId: position.accountId,
    assetId,
    runeAddress: position.runeAddress,
    assetAddress: position.assetAddress,
  }
}

type UseUserLpDataProps = {
  assetId: AssetId
  accountId?: AccountId
}

export const useUserLpData = ({
  assetId,
  accountId,
}: UseUserLpDataProps): UseQueryResult<UserLpDataPosition[] | null> => {
  const queryClient = useQueryClient()
  const assets = useAppSelector(selectAssets)
  const assetAccountIds = useAppSelector(state => selectAccountIdsByAssetId(state, { assetId }))
  const thorchainAccountIds = useAppSelector(state =>
    selectAccountIdsByAssetId(state, { assetId: thorchainAssetId }),
  )
  const accountIds = [...(accountId ? [accountId] : assetAccountIds), ...thorchainAccountIds]
  const currentWalletId = useAppSelector(selectWalletId)

  const poolAssetMarketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const runeMarketData = useAppSelector(state => selectMarketDataById(state, thorchainAssetId))

  const { data: pool } = useQuery({
    ...reactQueries.thornode.poolData(assetId),
    // @lukemorales/query-key-factory only returns queryFn and queryKey - all others will be ignored in the returned object
    // 0 seconds garbage collect and stale times since this is used to get the current position value, we want this to always be cached-then-fresh
    staleTime: 0,
    gcTime: 0,
    enabled: !!assetId,
  })

  return useQuery({
    ...reactQueries.thorchainLp.userLpData(assetId, currentWalletId),
    // 60 seconds staleTime since this is used to get the current position value
    staleTime: 60_000,
    queryFn: async ({ queryKey }) => {
      const [, , , { assetId }] = queryKey

      return (
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
    },
    select: (positions: Position[] | undefined) => {
      if (!pool) return null

      return (positions ?? [])
        .map(position =>
          getUserLpDataPosition({
            assetId,
            assetPrice: poolAssetMarketData.price,
            assets,
            pool,
            position,
            runePrice: runeMarketData.price,
          }),
        )
        .filter(isSome)
    },
    enabled: Boolean(assetId && currentWalletId && pool),
  })
}
