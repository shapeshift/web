import { type AccountId, fromAccountId } from '@shapeshiftoss/caip'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import type { Result } from '@sniptt/monads'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { reactQueries } from 'react-queries'
import { selectAllowanceCryptoBaseUnit } from 'react-queries/hooks/selectors'
import type { GetAllowanceErr } from 'react-queries/types'
import { usdtAssetId } from 'components/Modals/FiatRamps/config'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { selectRelatedAssetIdsInclusive } from 'state/slices/related-assets-selectors'
import { useAppSelector } from 'state/store'

export const useIsApprovalNeeded = (
  tradeQuoteStep: TradeQuoteStep | undefined,
  sellAssetAccountId: AccountId | undefined,
) => {
  const relatedAssetIdsFilter = useMemo(() => ({ assetId: usdtAssetId }), [])
  const usdtAssetIds = useAppSelector(state =>
    selectRelatedAssetIdsInclusive(state, relatedAssetIdsFilter),
  )
  const isUsdtApprovalResetEnabled = useFeatureFlag('UsdtApprovalReset')
  const selectIsApprovalNeeded = useCallback(
    (data: Result<string, GetAllowanceErr>) => {
      if (tradeQuoteStep === undefined) return undefined

      const allowanceCryptoBaseUnit = selectAllowanceCryptoBaseUnit(data)
      const isApprovalNeeded =
        allowanceCryptoBaseUnit !== undefined
          ? bn(allowanceCryptoBaseUnit).lt(
              tradeQuoteStep.sellAmountIncludingProtocolFeesCryptoBaseUnit,
            )
          : false

      const hasAllowance = bnOrZero(allowanceCryptoBaseUnit).gt(0)
      const isUsdt = usdtAssetIds.some(assetId => assetId === tradeQuoteStep?.sellAsset.assetId)
      const isAllowanceResetNeeded =
        isUsdtApprovalResetEnabled && hasAllowance && isApprovalNeeded && isUsdt

      return {
        isApprovalNeeded,
        isAllowanceResetNeeded,
      }
    },
    [tradeQuoteStep, usdtAssetIds, isUsdtApprovalResetEnabled],
  )

  const queryParams = useMemo(() => {
    return {
      ...reactQueries.common.allowanceCryptoBaseUnit(
        tradeQuoteStep?.sellAsset.assetId,
        tradeQuoteStep?.allowanceContract,
        sellAssetAccountId ? fromAccountId(sellAssetAccountId)?.account : undefined,
      ),
      refetchInterval: 15_000,
      select: selectIsApprovalNeeded,
    }
  }, [
    selectIsApprovalNeeded,
    sellAssetAccountId,
    tradeQuoteStep?.allowanceContract,
    tradeQuoteStep?.sellAsset.assetId,
  ])

  const query = useQuery(queryParams)

  return query
}
