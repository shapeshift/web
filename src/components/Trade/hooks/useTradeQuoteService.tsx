import { skipToken } from '@reduxjs/toolkit/query'
import { fromAssetId } from '@shapeshiftoss/caip'
import { type GetTradeQuoteInput } from '@shapeshiftoss/swapper'
import { DEFAULT_SLIPPAGE } from 'constants/constants'
import { useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useReceiveAddress } from 'components/Trade/hooks/useReceiveAddress'
import { getTradeQuoteArgs } from 'components/Trade/hooks/useSwapper/getTradeQuoteArgs'
import type { TS } from 'components/Trade/types'
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
The only mutation is on TradeState's quote property.
*/
export const useTradeQuoteService = () => {
  // Form hooks
  const { control, setValue } = useFormContext<TS>()
  const sellTradeAsset = useWatch({ control, name: 'sellTradeAsset' })
  const buyTradeAsset = useWatch({ control, name: 'buyTradeAsset' })
  const sellAssetAccountId = useWatch({ control, name: 'sellAssetAccountId' })
  const amount = useWatch({ control, name: 'amount' })
  const action = useWatch({ control, name: 'action' })
  const isSendMax = useWatch({ control, name: 'isSendMax' })
  const quote = useWatch({ control, name: 'quote' })

  // Types
  type TradeQuoteQueryInput = Parameters<typeof useGetTradeQuoteQuery>
  type TradeQuoteInputArg = TradeQuoteQueryInput[0]

  // State
  const wallet = useWallet().state.wallet
  const [tradeQuoteArgs, setTradeQuoteArgs] = useState<TradeQuoteInputArg>(skipToken)
  const { receiveAddress } = useReceiveAddress()

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

        const tradeQuoteInputArgs: GetTradeQuoteInput | undefined = await getTradeQuoteArgs({
          sellAsset,
          sellAccountBip44Params: sellAccountMetadata.bip44Params,
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
    setValue,
    wallet,
    isSendMax,
  ])

  // Update trade quote
  useEffect(() => setValue('quote', tradeQuote), [tradeQuote, setValue])

  // Set slippage if the quote contains a recommended value, else use the default
  useEffect(
    () =>
      setValue(
        'slippage',
        tradeQuote?.recommendedSlippage ? tradeQuote.recommendedSlippage : DEFAULT_SLIPPAGE,
      ),
    [tradeQuote, setValue],
  )

  // Set trade quote if not yet set (e.g. on page load)
  useEffect(() => {
    // Checking that no quote has been set and tradeQuote exists prevents an infinite render
    !quote && tradeQuote && setValue('quote', tradeQuote)
  }, [quote, setValue, tradeQuote])

  return {
    isLoadingTradeQuote,
    tradeQuoteArgs: typeof tradeQuoteArgs === 'symbol' ? undefined : tradeQuoteArgs,
  }
}
