import { type AccountId, fromAccountId } from '@shapeshiftoss/caip'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import type { Result } from '@sniptt/monads'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { reactQueries } from 'react-queries'
import { selectAllowanceCryptoBaseUnit } from 'react-queries/hooks/selectors'
import type { GetAllowanceErr } from 'react-queries/types'
import { bn } from 'lib/bignumber/bignumber'

export const useIsApprovalNeeded = (
  tradeQuoteStep: TradeQuoteStep | undefined,
  sellAssetAccountId: AccountId | undefined,
) => {
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

      const isAllowanceResetNeeded = false // TODO: implement allowance reset logic

      return {
        isApprovalNeeded,
        isAllowanceResetNeeded,
      }
    },
    [tradeQuoteStep],
  )

  const queryParams = useMemo(() => {
    return {
      ...reactQueries.common.allowanceCryptoBaseUnit(
        tradeQuoteStep?.sellAsset.assetId,
        tradeQuoteStep?.allowanceContract,
        sellAssetAccountId ? fromAccountId(sellAssetAccountId)?.account : undefined,
      ),
      refetchInterval: 15_000,
      enabled: Boolean(true),
      select: selectIsApprovalNeeded,
    }
  }, [
    selectIsApprovalNeeded,
    sellAssetAccountId,
    tradeQuoteStep?.allowanceContract,
    tradeQuoteStep?.sellAsset.assetId,
  ])

  const { data, isLoading: isApprovalNeededLoading } = useQuery(queryParams)

  const result = useMemo(
    () => ({
      isLoading: data === undefined || tradeQuoteStep === undefined || isApprovalNeededLoading,
      isApprovalNeeded: data?.isApprovalNeeded,
      isAllowanceResetNeeded: data?.isAllowanceResetNeeded,
    }),
    [data, isApprovalNeededLoading, tradeQuoteStep],
  )

  return result
}
