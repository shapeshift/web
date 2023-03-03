import { skipToken } from '@reduxjs/toolkit/query'
import { fromAssetId } from '@shapeshiftoss/caip'
import { type GetTradeQuoteInput } from '@shapeshiftoss/swapper'
import { DEFAULT_SLIPPAGE } from 'constants/constants'
import { useEffect } from 'react'
import { getTradeQuoteArgs } from 'components/Trade/hooks/useSwapper/getTradeQuoteArgs'
import type { SwapperContextType } from 'components/Trade/SwapperProvider/types'
import { SwapperActionType } from 'components/Trade/SwapperProvider/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useGetTradeQuoteQuery } from 'state/apis/swapper/getTradeQuoteApi'
import {
  selectFiatToUsdRate,
  selectPortfolioAccountIdsByAssetId,
  selectPortfolioAccountMetadataByAccountId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

/*
The Trade Quote Service is responsible for reacting to changes to trade assets and updating the quote accordingly.
The only mutation is on the quote property of SwapperState.
*/
export const useTradeQuoteService = (context: SwapperContextType) => {
  const {
    state: {
      sellTradeAsset,
      buyTradeAsset,
      sellAssetAccountId,
      action,
      isSendMax,
      quote,
      amount,
      receiveAddress,
      tradeQuoteInputArgs,
    },
    dispatch: swapperDispatch,
  } = context

  // State
  const wallet = useWallet().state.wallet

  // Constants
  const sellAsset = sellTradeAsset?.asset
  const buyAsset = buyTradeAsset?.asset

  // Selectors
  const selectedCurrencyToUsdRate = useAppSelector(selectFiatToUsdRate)

  const sellAssetAccountIds = useAppSelector(state =>
    selectPortfolioAccountIdsByAssetId(state, {
      assetId: sellAsset?.assetId ?? '',
    }),
  )
  const sellAccountFilter = { accountId: sellAssetAccountId ?? sellAssetAccountIds[0] }
  const sellAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, sellAccountFilter),
  )

  // API
  const { data: tradeQuote } = useGetTradeQuoteQuery(tradeQuoteInputArgs ?? skipToken, {
    pollingInterval: 30000,
  })

  // Effects
  // Set trade quote args and trigger trade quote query
  useEffect(() => {
    const sellTradeAssetAmountCryptoPrecision = sellTradeAsset?.amountCryptoPrecision
    if (
      sellAsset &&
      buyAsset &&
      wallet &&
      sellTradeAssetAmountCryptoPrecision &&
      receiveAddress &&
      sellAccountMetadata
    ) {
      ;(async () => {
        const { chainId: receiveAddressChainId } = fromAssetId(buyAsset.assetId)
        const chainAdapter = getChainAdapterManager().get(receiveAddressChainId)

        if (!chainAdapter)
          throw new Error(`couldn't get chain adapter for ${receiveAddressChainId}`)
        const { accountNumber: sellAccountNumber } = sellAccountMetadata.bip44Params

        const tradeQuoteInputArgs: GetTradeQuoteInput | undefined = await getTradeQuoteArgs({
          sellAsset,
          sellAccountNumber,
          sellAccountType: sellAccountMetadata.accountType,
          buyAsset,
          wallet,
          receiveAddress,
          sellAmountBeforeFeesCryptoPrecision: sellTradeAssetAmountCryptoPrecision,
          isSendMax,
        })
        tradeQuoteInputArgs &&
          swapperDispatch({
            type: SwapperActionType.SET_VALUES,
            payload: { tradeQuoteInputArgs },
          })
      })()
    }
  }, [
    action,
    amount,
    buyAsset,
    buyTradeAsset,
    receiveAddress,
    sellAccountMetadata,
    selectedCurrencyToUsdRate,
    sellAsset,
    sellTradeAsset,
    wallet,
    isSendMax,
    swapperDispatch,
  ])

  // Update trade quote
  useEffect(
    () => swapperDispatch({ type: SwapperActionType.SET_VALUES, payload: { quote: tradeQuote } }),
    [tradeQuote, swapperDispatch],
  )

  // Set slippage if the quote contains a recommended value, else use the default
  useEffect(
    () =>
      swapperDispatch({
        type: SwapperActionType.SET_VALUES,
        payload: {
          slippage: tradeQuote?.recommendedSlippage
            ? tradeQuote.recommendedSlippage
            : DEFAULT_SLIPPAGE,
        },
      }),
    [tradeQuote, swapperDispatch],
  )

  // Set trade quote if not yet set (e.g. on page load)
  useEffect(() => {
    // Checking that no quote has been set and tradeQuote exists prevents an infinite render
    !quote &&
      tradeQuote &&
      swapperDispatch({ type: SwapperActionType.SET_VALUES, payload: { quote: tradeQuote } })
  }, [swapperDispatch, quote, tradeQuote])
}
