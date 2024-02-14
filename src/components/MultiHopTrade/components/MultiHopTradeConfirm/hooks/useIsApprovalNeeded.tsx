import type { AccountId } from '@shapeshiftoss/caip'
import { type EvmChainId, evmChainIds } from '@shapeshiftoss/chain-adapters'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useMemo } from 'react'
import { bn } from 'lib/bignumber/bignumber'
import { assertUnreachable } from 'lib/utils'

import { GetAllowanceErr } from './helpers'
import { useMultiHopTradeStepAllowance } from './useMultiHopTradeStepAllowance'

export const useIsApprovalNeeded = (
  tradeQuoteStep: TradeQuoteStep | undefined,
  sellAssetAccountId: AccountId | undefined,
) => {
  const { isLoading, data } = useMultiHopTradeStepAllowance(tradeQuoteStep, sellAssetAccountId)

  // TODO(gomes): this already works as-is thanks to the 15s refetch interval, but surely we could do one better?
  // Can we introspect there's an approval Txid, and fire `invalidateQueries`?
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
