import { skipToken } from '@reduxjs/toolkit/dist/query'
import { useEffect, useMemo, useState } from 'react'
import { getTradeQuoteArgs } from 'components/Trade/hooks/useSwapper/getTradeQuoteArgs'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { GetTradeQuoteInput } from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'
import { isSkipToken } from 'lib/utils'
import {
  selectBuyAsset,
  selectPortfolioAccountIdsByAssetId,
  selectPortfolioAccountMetadataByAccountId,
  selectReceiveAddress,
  selectSellAmountCryptoPrecision,
  selectSellAsset,
  selectSellAssetAccountId,
} from 'state/slices/selectors'
import { useGetLifiTradeQuoteQuery } from 'state/slices/swappersSlice/swappersSlice'
import { store, useAppSelector } from 'state/store'

export const useGetTradeQuotes = () => {
  const isLifiEnabled = useFeatureFlag('LifiSwap')
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
        })

        setTradeQuoteInput(tradeQuoteInputArgs ?? skipToken)
      })()
    } else {
      setTradeQuoteInput(skipToken)
    }
  }, [buyAsset, receiveAddress, sellAccountMetadata, sellAmountCryptoPrecision, sellAsset, wallet])

  const { isFetching, data, error } = useGetLifiTradeQuoteQuery(tradeQuoteInput, {
    skip: !isLifiEnabled,
  })

  // TODO(woodenfurniture): sorting of quotes
  // TODO(woodenfurniture): quote selection
  const sortedQuotes = useMemo(() => {
    if (isSkipToken(tradeQuoteInput)) return []

    const lifiInputOutputRatio = 1 // TODO(woodenfurniture): calculate this

    return [
      {
        isLoading: isFetching,
        data,
        error,
        swapperName: SwapperName.LIFI,
        inputOutputRatio: lifiInputOutputRatio,
      },
    ]
  }, [data, error, isFetching, tradeQuoteInput])
  return {
    sortedQuotes,
    selectedQuote: sortedQuotes[0],
  }
}
