import { skipToken } from '@reduxjs/toolkit/query'
import { fromAssetId } from '@shapeshiftoss/caip'
import { type GetTradeQuoteInput } from '@shapeshiftoss/swapper'
import { DEFAULT_SLIPPAGE } from 'constants/constants'
import { useEffect, useState } from 'react'
import { getTradeQuoteArgs } from 'components/Trade/hooks/useSwapper/getTradeQuoteArgs'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useGetTradeQuoteQuery } from 'state/apis/swapper/getTradeQuoteApi'
import {
  selectFiatToUsdRate,
  selectPortfolioAccountIdsByAssetId,
  selectPortfolioAccountMetadataByAccountId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

/*
The Trade Quote Service is responsible for reacting to changes to trade assets and updating the quote accordingly.
The only mutation is on the quote property of SwapperState.
*/
export const useTradeQuoteService = () => {
  // Types
  type TradeQuoteQueryInput = Parameters<typeof useGetTradeQuoteQuery>
  type TradeQuoteInputArg = TradeQuoteQueryInput[0]

  // State
  const wallet = useWallet().state.wallet
  const [tradeQuoteArgs, setTradeQuoteArgs] = useState<TradeQuoteInputArg>(skipToken)

  // Selectors
  const selectedCurrencyToUsdRate = useAppSelector(selectFiatToUsdRate)
  const quote = useSwapperStore(state => state.quote)
  const updateQuote = useSwapperStore(state => state.updateQuote)
  const sellTradeAsset = useSwapperStore(state => state.sellTradeAsset)
  const buyTradeAsset = useSwapperStore(state => state.buyTradeAsset)
  const action = useSwapperStore(state => state.action)
  const isSendMax = useSwapperStore(state => state.isSendMax)
  const amount = useSwapperStore(state => state.amount)
  const receiveAddress = useSwapperStore(state => state.receiveAddress)
  const updateSlippage = useSwapperStore(state => state.updateSlippage)
  const sellAssetAccountId = useSwapperStore(state => state.sellAssetAccountId)

  const sellAsset = sellTradeAsset?.asset
  const buyAsset = buyTradeAsset?.asset

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
  const { data: tradeQuote, isLoading: isLoadingTradeQuote } = useGetTradeQuoteQuery(
    tradeQuoteArgs,
    { pollingInterval: 30000 },
  )

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
        tradeQuoteInputArgs && setTradeQuoteArgs(tradeQuoteInputArgs)
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
  ])

  // Update trade quote
  useEffect(() => updateQuote(tradeQuote), [tradeQuote, updateQuote])

  // Set slippage if the quote contains a recommended value, else use the default
  useEffect(
    () =>
      updateSlippage(
        tradeQuote?.recommendedSlippage ? tradeQuote.recommendedSlippage : DEFAULT_SLIPPAGE,
      ),
    [tradeQuote, updateSlippage],
  )

  // Set trade quote if not yet set (e.g. on page load)
  useEffect(() => {
    // Checking that no quote has been set and tradeQuote exists prevents an infinite render
    !quote && tradeQuote && updateQuote(tradeQuote)
  }, [quote, tradeQuote, updateQuote])

  return {
    isLoadingTradeQuote,
    tradeQuoteArgs: typeof tradeQuoteArgs === 'symbol' ? undefined : tradeQuoteArgs,
  }
}
