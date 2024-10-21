import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { TradeQuote, TradeQuoteStep } from '@shapeshiftoss/swapper'
import assert from 'assert'
import { useCallback, useMemo } from 'react'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useWallet } from 'hooks/useWallet/useWallet'
import { assertGetEvmChainAdapter } from 'lib/utils/evm'
import { selectPortfolioAccountMetadataByAccountId } from 'state/slices/selectors'
import { selectHopSellAccountId } from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

// handles allowance approval tx execution, fees, and state orchestration
export const useSignPermit2 = (
  tradeQuoteStep: TradeQuoteStep,
  hopIndex: number,
  confirmedTradeId: TradeQuote['id'],
) => {
  const dispatch = useAppDispatch()
  const { showErrorToast } = useErrorHandler()
  const wallet = useWallet().state.wallet ?? undefined

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
      assert(tradeQuoteStep.permit2Eip712, 'Trade quote is missing permit2 eip712 metadata')
      const typedDataToSign = {
        addressNList: toAddressNList(accountMetadata.bip44Params),
        typedData: tradeQuoteStep?.permit2Eip712,
      }

      const adapter = assertGetEvmChainAdapter(tradeQuoteStep.sellAsset.chainId)
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
    tradeQuoteStep.permit2Eip712,
    tradeQuoteStep.sellAsset.chainId,
    wallet,
  ])

  return {
    signPermit2,
  }
}
