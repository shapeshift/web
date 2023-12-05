import type { AccountId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useAllowance } from 'components/MultiHopTrade/components/MultiHopTradeConfirm/hooks/useAllowance'
import { bn } from 'lib/bignumber/bignumber'
import type { TradeQuoteStep } from 'lib/swapper/types'
import { assertUnreachable } from 'lib/utils'

import { GetAllowanceErr } from '../../../hooks/useAllowanceApproval/helpers'

export type UseIsApprovalNeededProps = {
  watch: boolean
  tradeQuoteStep: TradeQuoteStep | undefined
  sellAssetAccountId: AccountId | undefined
}

export const useIsApprovalNeeded = ({
  watch,
  tradeQuoteStep,
  sellAssetAccountId,
}: UseIsApprovalNeededProps) => {
  const { isLoading, data } = useAllowance({
    sellAssetAccountId,
    tradeQuoteStep,
    watch,
    enabled: true,
  })

  const isApprovalNeeded = useMemo(() => {
    if (tradeQuoteStep === undefined) return false

    if (data?.isErr) {
      const error = data.unwrapErr()
      // the error type is a GetAllowanceErr enum so we can handle all cases with exhaustiveness
      // checking to prevent returning the wrong value if we add more error cases
      switch (error) {
        case GetAllowanceErr.IsFeeAsset:
        case GetAllowanceErr.NotEVMChain:
          // approval not required
          return false
        case GetAllowanceErr.MissingArgs:
          // not known yet
          return undefined
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
  }, [data, tradeQuoteStep])

  return { isLoading, isApprovalNeeded }
}
