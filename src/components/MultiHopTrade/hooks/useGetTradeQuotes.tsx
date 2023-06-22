import { skipToken } from '@reduxjs/toolkit/dist/query'
import { orderBy } from 'lodash'
import { useEffect, useMemo, useState } from 'react'
import { useReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import type { TradeQuoteResult } from 'components/MultiHopTrade/types'
import { getTradeQuoteArgs } from 'components/Trade/hooks/useSwapper/getTradeQuoteArgs'
import { useDebounce } from 'hooks/useDebounce/useDebounce'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { GetTradeQuoteInput } from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'
import { isSkipToken } from 'lib/utils'
import { useGetLifiTradeQuoteQuery } from 'state/apis/swappers/lifiSwapperApi'
import { useGetThorTradeQuoteQuery } from 'state/apis/swappers/thorSwapperApi'
import {
  selectBuyAsset,
  selectFeatureFlags,
  selectPortfolioAccountIdsByAssetId,
  selectPortfolioAccountMetadataByAccountId,
  selectSellAmountCryptoPrecision,
  selectSellAsset,
  selectSellAssetAccountId,
} from 'state/slices/selectors'
import { getInputOutputRatioFromQuote } from 'state/slices/tradeQuoteSlice/helpers'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { store, useAppDispatch, useAppSelector } from 'state/store'

export const useGetTradeQuotes = () => {
  const flags = useAppSelector(selectFeatureFlags)
  const wallet = useWallet().state.wallet
  const dispatch = useAppDispatch()
  const [tradeQuoteInput, setTradeQuoteInput] = useState<GetTradeQuoteInput | typeof skipToken>(
    skipToken,
  )
  const debouncedTradeQuoteInput = useDebounce(tradeQuoteInput, 500)
  const sellAsset = useAppSelector(selectSellAsset)
  const buyAsset = useAppSelector(selectBuyAsset)
  const sellAssetAccountId = useAppSelector(selectSellAssetAccountId)
  const receiveAddress = useReceiveAddress()
  const sellAmountCryptoPrecision = useAppSelector(selectSellAmountCryptoPrecision)

  const sellAccountMetadata = useMemo(() => {
    const sellAssetAccountIds = selectPortfolioAccountIdsByAssetId(store.getState(), {
      assetId: sellAsset.assetId,
    })
    return selectPortfolioAccountMetadataByAccountId(store.getState(), {
      accountId: sellAssetAccountId ?? sellAssetAccountIds[0],
    })
  }, [sellAsset.assetId, sellAssetAccountId])

  useEffect(() => {
    if (wallet && sellAccountMetadata) {
      ;(async () => {
        const { accountNumber: sellAccountNumber } = sellAccountMetadata.bip44Params

        const tradeQuoteInputArgs: GetTradeQuoteInput | undefined = await getTradeQuoteArgs({
          sellAsset,
          sellAccountNumber,
          sellAccountType: sellAccountMetadata.accountType,
          buyAsset,
          wallet,
          receiveAddress,
          sellAmountBeforeFeesCryptoPrecision: sellAmountCryptoPrecision,
          allowMultiHop: flags.MultiHopTrades,
        })

        setTradeQuoteInput(tradeQuoteInputArgs ?? skipToken)
      })()
    } else {
      setTradeQuoteInput(skipToken)
    }
  }, [
    buyAsset,
    flags.MultiHopTrades,
    receiveAddress,
    sellAccountMetadata,
    sellAmountCryptoPrecision,
    sellAsset,
    wallet,
  ])

  const lifiQuery = useGetLifiTradeQuoteQuery(debouncedTradeQuoteInput, {
    skip: !flags.LifiSwap,
  })

  const thorQuery = useGetThorTradeQuoteQuery(debouncedTradeQuoteInput, {
    skip: !flags.ThorSwap,
  })

  // TODO(woodenfurniture): quote selection
  const sortedQuotes: TradeQuoteResult[] = useMemo(() => {
    if (isSkipToken(debouncedTradeQuoteInput)) return []

    const results = [
      {
        isLoading: thorQuery.isFetching,
        data: thorQuery.data,
        error: thorQuery.error,
        swapperName: SwapperName.Thorchain,
      },
      {
        isLoading: lifiQuery.isFetching,
        data: lifiQuery.data,
        error: lifiQuery.error,
        swapperName: SwapperName.LIFI,
      },
    ].map(result => {
      const quote = result.data && result.data.isOk() ? result.data.unwrap() : undefined
      const inputOutputRatio = quote
        ? getInputOutputRatioFromQuote({
            quote,
            swapperName: result.swapperName,
          })
        : -Infinity
      return Object.assign(result, { inputOutputRatio })
    })

    return orderBy(results, ['inputOutputRatio', 'swapperName'], ['asc', 'asc'])
  }, [
    debouncedTradeQuoteInput,
    thorQuery.isFetching,
    thorQuery.data,
    thorQuery.error,
    lifiQuery.isFetching,
    lifiQuery.data,
    lifiQuery.error,
  ])

  const bestQuote: TradeQuoteResult = sortedQuotes[0]
  const quote = bestQuote?.data && bestQuote.data.isOk() ? bestQuote.data.unwrap() : undefined
  const error = bestQuote?.data && bestQuote.data.isErr() ? bestQuote.data.unwrapErr() : undefined
  dispatch(tradeQuoteSlice.actions.setSwapperName(bestQuote?.swapperName))
  dispatch(tradeQuoteSlice.actions.setQuote(quote))
  dispatch(tradeQuoteSlice.actions.setError(error))
  return {
    sortedQuotes,
    selectedQuote: sortedQuotes[0],
  }
}
