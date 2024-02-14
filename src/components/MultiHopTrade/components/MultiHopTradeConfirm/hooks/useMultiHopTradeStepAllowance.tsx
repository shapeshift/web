import { type AccountId, fromAccountId } from '@shapeshiftoss/caip'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { useMemo } from 'react'
import { useAllowance } from 'react-queries/hooks/useAllowance'

export function useMultiHopTradeStepAllowance(
  tradeQuoteStep: TradeQuoteStep | undefined,
  sellAssetAccountId: AccountId | undefined,
) {
  const {
    allowanceContract,
    sellAsset: { assetId },
  } = useMemo(
    () =>
      tradeQuoteStep ?? {
        allowanceContract: undefined,
        sellAsset: { assetId: undefined },
      },
    [tradeQuoteStep],
  )
  const allowanceQuery = useAllowance({
    assetId,
    // No need for a wallet call here - the account address *is* already available using fromAccountId()
    // Yes, this doesn't work for account-based accounts, if we're not dealing with an EVM chain, we don't need to check for allowance either way.
    from: sellAssetAccountId ? fromAccountId(sellAssetAccountId)?.account : undefined,
    spender: allowanceContract,
  })
  return allowanceQuery
}
