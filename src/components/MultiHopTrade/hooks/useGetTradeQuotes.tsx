import { skipToken } from '@reduxjs/toolkit/dist/query'
import { useEffect, useMemo, useState } from 'react'
import { getTradeQuoteArgs } from 'components/Trade/hooks/useSwapper/getTradeQuoteArgs'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { GetTradeQuoteInput } from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'
import { isSkipToken } from 'lib/utils'
import {
  selectBuyAsset,
  selectFeatureFlags,
  selectPortfolioAccountIdsByAssetId,
  selectPortfolioAccountMetadataByAccountId,
  selectReceiveAddress,
  selectSellAmountCryptoPrecision,
  selectSellAsset,
  selectSellAssetAccountId,
} from 'state/slices/selectors'
import {
  useGetLifiTradeQuoteQuery,
  useGetThorTradeQuoteQuery,
} from 'state/slices/swappersSlice/swappersSlice'
import { store, useAppSelector } from 'state/store'

export const useGetTradeQuotes = () => {
  const flags = useAppSelector(selectFeatureFlags)
  const wallet = useWallet().state.wallet
  const [tradeQuoteInput, setTradeQuoteInput] = useState<GetTradeQuoteInput | typeof skipToken>(
    skipToken,
  )
  const sellAsset = useAppSelector(selectSellAsset)
  const buyAsset = useAppSelector(selectBuyAsset)
  const sellAssetAccountId = useAppSelector(selectSellAssetAccountId)
  const receiveAddress = useAppSelector(selectReceiveAddress)
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

  const lifiQuery = useGetLifiTradeQuoteQuery(tradeQuoteInput, {
    skip: !flags.LifiSwap,
  })

  const thorQuery = useGetThorTradeQuoteQuery(tradeQuoteInput, {
    skip: !flags.ThorSwap,
  })

  // TODO(woodenfurniture): sorting of quotes
  // TODO(woodenfurniture): quote selection
  const sortedQuotes = useMemo(() => {
    if (isSkipToken(tradeQuoteInput)) return []

    const thorInputOutputRatio = 0.9 // TODO(woodenfurniture): calculate this
    const lifiInputOutputRatio = 0.8 // TODO(woodenfurniture): calculate this

    lifiQuery.data?.isErr() && console.log('lifiQuery', lifiQuery.data?.unwrapErr())
    thorQuery.data?.isErr() && console.log('thorQuery', thorQuery.data?.unwrapErr())

    return [
      {
        isLoading: thorQuery.isFetching,
        data: thorQuery.data,
        error: thorQuery.error,
        swapperName: SwapperName.Thorchain,
        inputOutputRatio: thorInputOutputRatio,
      },
      {
        isLoading: lifiQuery.isFetching,
        data: lifiQuery.data,
        error: lifiQuery.error,
        swapperName: SwapperName.LIFI,
        inputOutputRatio: lifiInputOutputRatio,
      },
    ]
  }, [
    lifiQuery.data,
    lifiQuery.error,
    lifiQuery.isFetching,
    thorQuery.data,
    thorQuery.error,
    thorQuery.isFetching,
    tradeQuoteInput,
  ])
  return {
    sortedQuotes,
    selectedQuote: sortedQuotes[0],
  }
}
