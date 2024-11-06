import { fromAccountId } from '@shapeshiftoss/caip'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { TradeQuote, TradeQuoteStep } from '@shapeshiftoss/swapper'
import { fetchZrxPermit2Quote } from '@shapeshiftoss/swapper/dist/swappers/ZrxSwapper/utils/fetchFromZrx'
import { skipToken, useQuery } from '@tanstack/react-query'
import { getConfig } from 'config'
import type { TypedData } from 'eip-712'
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

  const sellAssetAccountAddress = useMemo(
    () => (sellAssetAccountId ? fromAccountId(sellAssetAccountId).account : undefined),
    [sellAssetAccountId],
  )

  // Fetch permit2 in-place
  const { isFetching, data: permit2Eip712Data } = useQuery({
    queryKey: ['zrxPermit2', tradeQuoteStep],
    queryFn: sellAssetAccountAddress
      ? () =>
          fetchZrxPermit2Quote({
            buyAsset: tradeQuoteStep.buyAsset,
            sellAsset: tradeQuoteStep.sellAsset,
            sellAmountIncludingProtocolFeesCryptoBaseUnit:
              tradeQuoteStep.sellAmountIncludingProtocolFeesCryptoBaseUnit,
            sellAddress: sellAssetAccountAddress,
            // irrelevant, we're only concerned about this query for the sole purpose of getting eip712 typed data
            affiliateBps: '0',
            // irrelevant for the same reason as above
            slippageTolerancePercentageDecimal: '0.020',
            zrxBaseUrl: getConfig().REACT_APP_ZRX_BASE_URL,
          })
      : skipToken,
    select: data => {
      if (data.isErr()) throw data.unwrapErr()

      const { permit2 } = data.unwrap()

      return permit2?.eip712 as TypedData | undefined
    },
  })

  const accountMetadataFilter = useMemo(
    () => ({ accountId: sellAssetAccountId }),
    [sellAssetAccountId],
  )
  const accountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, accountMetadataFilter),
  )

  const signPermit2 = useCallback(async () => {
    if (!wallet || !accountMetadata || !permit2Eip712Data) return

    dispatch(
      tradeQuoteSlice.actions.setPermit2SignaturePending({
        hopIndex,
        id: confirmedTradeId,
      }),
    )

    try {
      const typedDataToSign = {
        addressNList: toAddressNList(accountMetadata.bip44Params),
        typedData: permit2Eip712Data,
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
    permit2Eip712Data,
    showErrorToast,
    tradeQuoteStep.sellAsset.chainId,
    wallet,
  ])

  return {
    signPermit2,
    isLoading: isFetching,
  }
}
