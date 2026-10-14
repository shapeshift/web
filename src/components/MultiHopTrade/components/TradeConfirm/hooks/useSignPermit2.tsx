import { ChainAdapterError, toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { TradeQuote, TradeQuoteStep } from '@shapeshiftoss/swapper'
import { getPermit2Eip712, isExecutableTradeQuote } from '@shapeshiftoss/swapper'
import assert from 'assert'
import { useCallback, useMemo } from 'react'

import { useErrorToast } from '@/hooks/useErrorToast/useErrorToast'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { assertGetEvmChainAdapter } from '@/lib/utils/evm'
import { selectPortfolioAccountMetadataByAccountId } from '@/state/slices/selectors'
import {
  selectConfirmedQuote,
  selectHopSellAccountId,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from '@/state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

// handles allowance approval tx execution, fees, and state orchestration
export const useSignPermit2 = (
  tradeQuoteStep: TradeQuoteStep,
  hopIndex: number,
  confirmedTradeId: TradeQuote['id'],
) => {
  const dispatch = useAppDispatch()
  const { showErrorToast } = useErrorToast()
  const wallet = useWallet().state.wallet ?? undefined
  const tradeQuote = useAppSelector(selectConfirmedQuote)

  const hopSellAccountIdFilter = useMemo(() => {
    return {
      hopIndex,
    }
  }, [hopIndex])

  const sellAssetAccountId = useAppSelector(state =>
    selectHopSellAccountId(state, hopSellAccountIdFilter),
  )

  const accountMetadataFilter = useMemo(
    () => ({ accountId: sellAssetAccountId }),
    [sellAssetAccountId],
  )
  const accountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, accountMetadataFilter),
  )

  const signPermit2 = useCallback(async () => {
    if (!wallet || !accountMetadata) return

    dispatch(
      tradeQuoteSlice.actions.setPermit2SignaturePending({
        hopIndex,
        id: confirmedTradeId,
      }),
    )

    try {
      if (
        hopIndex === 0 &&
        tradeQuote &&
        isExecutableTradeQuote(tradeQuote) &&
        tradeQuote.deadline !== undefined &&
        Date.now() > tradeQuote.deadline
      ) {
        throw new ChainAdapterError('Quote expired', { translation: 'trade.errors.quoteExpired' })
      }

      const permit2Eip712 = getPermit2Eip712(tradeQuoteStep)
      assert(permit2Eip712, 'Trade quote is missing permit2 eip712 metadata')

      const adapter = assertGetEvmChainAdapter(tradeQuoteStep.sellAsset.chainId)

      const typedDataToSign = {
        addressNList: toAddressNList(adapter.getBip44Params(accountMetadata.bip44Params)),
        typedData: permit2Eip712,
      }

      const permit2Signature = await adapter.signTypedData({ typedDataToSign, wallet })

      dispatch(
        tradeQuoteSlice.actions.setPermit2SignatureComplete({
          hopIndex,
          id: confirmedTradeId,
          permit2Signature,
        }),
      )
    } catch (err) {
      dispatch(
        tradeQuoteSlice.actions.setPermit2SignatureFailed({
          hopIndex,
          id: confirmedTradeId,
        }),
      )
      showErrorToast(err)
      return
    }
  }, [
    accountMetadata,
    confirmedTradeId,
    dispatch,
    hopIndex,
    showErrorToast,
    tradeQuoteStep,
    tradeQuote,
    wallet,
  ])

  return {
    signPermit2,
  }
}
