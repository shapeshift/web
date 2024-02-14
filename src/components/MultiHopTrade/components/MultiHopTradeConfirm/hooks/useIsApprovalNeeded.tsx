import { type AccountId, fromAccountId } from '@shapeshiftoss/caip'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import type { Result } from '@sniptt/monads'
import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { reactQueries } from 'react-queries'
import { bn } from 'lib/bignumber/bignumber'
import { assertUnreachable } from 'lib/utils'

import { GetAllowanceErr } from './helpers'

export const useIsApprovalNeeded = (
  tradeQuoteStep: TradeQuoteStep | undefined,
  sellAssetAccountId: AccountId | undefined,
) => {
  const selectIsApprovalNeeded = useCallback(
    (data: Result<string, GetAllowanceErr>) => {
      if (tradeQuoteStep === undefined) return undefined

      if (data?.isErr()) {
        const error = data.unwrapErr()
        // the error type is a GetAllowanceErr enum so we can handle all cases with exhaustiveness
        // checking to prevent returning the wrong value if we add more error cases
        switch (error) {
          case GetAllowanceErr.IsFeeAsset:
          case GetAllowanceErr.NotEVMChain:
            // approval not required
            return false
          default:
            assertUnreachable(error)
        }
      }

      const allowanceOnChainCryptoBaseUnit = data?.unwrap()
      return allowanceOnChainCryptoBaseUnit !== undefined
        ? bn(allowanceOnChainCryptoBaseUnit).lt(
            tradeQuoteStep.sellAmountIncludingProtocolFeesCryptoBaseUnit,
          )
        : undefined
    },
    [tradeQuoteStep],
  )

  const { data: isApprovalNeeded, isLoading: isApprovalNeededLoading } = useQuery({
    ...reactQueries.common.allowanceCryptoBaseUnit(
      tradeQuoteStep?.sellAsset.assetId,
      tradeQuoteStep?.allowanceContract,
      sellAssetAccountId ? fromAccountId(sellAssetAccountId)?.account : undefined,
    ),
    refetchInterval: 15_000,
    enabled: Boolean(true),
    select: selectIsApprovalNeeded,
  })

  return {
    isLoading:
      isApprovalNeeded === undefined || tradeQuoteStep === undefined || isApprovalNeededLoading,
    isApprovalNeeded,
  }
}
