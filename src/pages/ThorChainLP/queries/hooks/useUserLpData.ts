import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import type { ThornodePoolResponse } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/types'
import type { AssetsByIdPartial } from '@shapeshiftoss/types'
import type { UseQueryResult } from '@tanstack/react-query'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { reactQueries } from 'react-queries'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { isSome } from 'lib/utils'
import { fromThorBaseUnit } from 'lib/utils/thorchain'
import { THORCHAIN_BLOCK_TIME_SECONDS, thorchainBlockTimeMs } from 'lib/utils/thorchain/constants'
import { getPoolShare } from 'lib/utils/thorchain/lp'
import type { Position, UserLpDataPosition } from 'lib/utils/thorchain/lp/types'
import { AsymSide } from 'lib/utils/thorchain/lp/types'
import { selectMarketDataByAssetIdUserCurrency } from 'state/slices/marketDataSlice/selectors'
import { selectAccountIdsByAssetId, selectAssets, selectWalletId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type GetPositionArgs = {
  pool: ThornodePoolResponse
  position: Position
  assets: AssetsByIdPartial
  assetId: AssetId
  assetPrice: string
  runePrice: string
  liquidityLockupTime: number
}

export const getUserLpDataPosition = ({
  pool,
  position,
  assets,
  assetId,
  assetPrice,
  runePrice,
  liquidityLockupTime,
}: GetPositionArgs): UserLpDataPosition | undefined => {
  const asset = assets[assetId]
  if (!asset) return

  const rune = assets[thorchainAssetId]
  if (!rune) return

  const { asym, name } = (() => {
    if (position.runeAddress === '') {
      return { asym: { side: AsymSide.Asset, asset }, name: asset.symbol }
    }

    if (position.assetAddress === '') {
      return { asym: { side: AsymSide.Rune, asset: rune }, name: rune.symbol }
    }

    return { asym: undefined, name: `${asset.symbol}/${rune.symbol}` }
  })()

  const { assetShareThorBaseUnit, runeShareThorBaseUnit, poolShareDecimalPercent } = getPoolShare(
    pool,
    bnOrZero(position.liquidityUnits),
  )

  const pendingAssetAmountCryptoPrecision = fromThorBaseUnit(position.assetPending)
  const pendingRuneAmountCryptoPrecision = fromThorBaseUnit(position.runePending)
  const pendingAssetAmountFiatUserCurrency = pendingAssetAmountCryptoPrecision.times(assetPrice)
  const pendingRuneAmountFiatUserCurrency = pendingRuneAmountCryptoPrecision.times(runePrice)

  const assetShareCryptoPrecision = fromThorBaseUnit(assetShareThorBaseUnit)
  const runeShareCryptoPrecision = fromThorBaseUnit(runeShareThorBaseUnit)
  const assetShareFiat = assetShareCryptoPrecision.times(assetPrice)
  const runeShareFiat = runeShareCryptoPrecision.times(runePrice)

  const status = (() => {
    const isPending = bnOrZero(position.runePending).gt(0) || bnOrZero(position.assetPending).gt(0)
    const assetPriceInRune = bnOrZero(pool.balance_rune).div(pool.balance_asset)

    if (!asym && bnOrZero(position.runePending).gt(0) && bnOrZero(position.assetPending).eq(0)) {
      const amountCryptoBaseUnit = bnOrZero(position.runePending).div(assetPriceInRune)
      const amountCryptoPrecision = fromThorBaseUnit(amountCryptoBaseUnit).toFixed()
      return { isPending, isIncomplete: true, incomplete: { asset, amountCryptoPrecision } }
    }

    if (!asym && bnOrZero(position.assetPending).gt(0) && bnOrZero(position.runePending).eq(0)) {
      const amountCryptoBaseUnit = bnOrZero(position.assetPending).times(assetPriceInRune).toFixed()
      const amountCryptoPrecision = fromThorBaseUnit(amountCryptoBaseUnit).toFixed()
      return { isPending, isIncomplete: true, incomplete: { asset: rune, amountCryptoPrecision } }
    }

    return { isPending, isIncomplete: false, incompleteAsset: undefined }
  })()

  const remainingLockupTime = (() => {
    const dateNow = Math.floor(Date.now() / 1000)
    const dateUnlocked = Number(position.dateLastAdded) + liquidityLockupTime
    return Math.max(dateUnlocked - dateNow, 0)
  })()

  return {
    name,
    dateFirstAdded: position.dateFirstAdded,
    liquidityUnits: position.liquidityUnits,
    asym,
    status,
    pendingAssetAmountCryptoPrecision: pendingAssetAmountCryptoPrecision.toFixed(),
    pendingRuneAmountCryptoPrecision: pendingRuneAmountCryptoPrecision.toFixed(),
    pendingAssetAmountFiatUserCurrency: pendingAssetAmountFiatUserCurrency.toFixed(),
    pendingRuneAmountFiatUserCurrency: pendingRuneAmountFiatUserCurrency.toFixed(),
    underlyingAssetAmountCryptoPrecision: assetShareCryptoPrecision.toFixed(),
    underlyingRuneAmountCryptoPrecision: runeShareCryptoPrecision.toFixed(),
    underlyingAssetAmountFiatUserCurrency: assetShareFiat.toFixed(),
    underlyingRuneAmountFiatUserCurrency: runeShareFiat.toFixed(),
    totalValueFiatUserCurrency: assetShareFiat.plus(runeShareFiat).toFixed(),
    poolOwnershipPercentage: bn(poolShareDecimalPercent).times(100).toFixed(),
    opportunityId: `${assetId}*${asym?.side ?? 'sym'}`,
    poolShare: poolShareDecimalPercent,
    accountId: position.accountId,
    assetId,
    runeAddress: position.runeAddress,
    assetAddress: position.assetAddress,
    remainingLockupTime,
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

  const poolAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetId),
  )
  const runeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, thorchainAssetId),
  )

  const liquidityLockupTime = useQuery({
    ...reactQueries.thornode.mimir(),
    staleTime: thorchainBlockTimeMs,
    select: mimirData => {
      const liquidityLockupBlocks = mimirData.LIQUIDITYLOCKUPBLOCKS as number | undefined
      return Number(bnOrZero(liquidityLockupBlocks).times(THORCHAIN_BLOCK_TIME_SECONDS).toFixed(0))
    },
  })

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
      if (!liquidityLockupTime.data) return null

      return (positions ?? [])
        .map(position =>
          getUserLpDataPosition({
            assetId,
            assetPrice: poolAssetMarketData.price,
            assets,
            pool,
            position,
            runePrice: runeMarketData.price,
            liquidityLockupTime: liquidityLockupTime.data,
          }),
        )
        .filter(isSome)
    },
    enabled: Boolean(assetId && currentWalletId && pool && liquidityLockupTime.isSuccess),
  })
}
