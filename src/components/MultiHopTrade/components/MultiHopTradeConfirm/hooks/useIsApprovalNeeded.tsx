import type { AccountId } from '@shapeshiftoss/caip'
import { type EvmChainId, evmChainIds } from '@shapeshiftoss/chain-adapters'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useMemo } from 'react'
import { useAllowance } from 'components/MultiHopTrade/components/MultiHopTradeConfirm/hooks/useAllowance'
import { bn } from 'lib/bignumber/bignumber'
import { assertUnreachable } from 'lib/utils'

import { GetAllowanceErr } from './helpers'

export const useIsApprovalNeeded = (
  tradeQuoteStep: TradeQuoteStep | undefined,
  sellAssetAccountId: AccountId | undefined,
  watch: boolean,
) => {
  const { isLoading, data } = useAllowance(tradeQuoteStep, sellAssetAccountId, watch)

  const isApprovalNeeded = useMemo(() => {
    if (tradeQuoteStep === undefined) return undefined

    const isEvmChainId = evmChainIds.includes(tradeQuoteStep.sellAsset.chainId as EvmChainId)

    if (!isEvmChainId) return false

    if (data?.isErr()) {
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

  return {
    isLoading: isApprovalNeeded === undefined || tradeQuoteStep === undefined || isLoading,
    isApprovalNeeded,
  }
}
