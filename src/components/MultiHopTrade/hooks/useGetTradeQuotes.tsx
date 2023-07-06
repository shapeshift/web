import { skipToken } from '@reduxjs/toolkit/dist/query'
import { isEqual } from 'lodash'
import { useEffect, useMemo, useState } from 'react'
import { useReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { getTradeQuoteArgs } from 'components/Trade/hooks/useSwapper/getTradeQuoteArgs'
import { useDebounce } from 'hooks/useDebounce/useDebounce'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { GetTradeQuoteInput } from 'lib/swapper/api'
import { useGetTradeQuoteQuery } from 'state/apis/swappers/swappersApi'
import {
  selectBuyAsset,
  selectFeatureFlags,
  selectPortfolioAccountMetadataByAccountId,
  selectSellAccountId,
  selectSellAmountCryptoPrecision,
  selectSellAsset,
  selectWillDonate,
} from 'state/slices/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { store, useAppDispatch, useAppSelector } from 'state/store'

export const useGetTradeQuotes = () => {
  const dispatch = useAppDispatch()
  const flags = useAppSelector(selectFeatureFlags)
  const wallet = useWallet().state.wallet
  const [tradeQuoteInput, setTradeQuoteInput] = useState<GetTradeQuoteInput | typeof skipToken>(
    skipToken,
  )
  const debouncedTradeQuoteInput = useDebounce(tradeQuoteInput, 500)
  const sellAsset = useAppSelector(selectSellAsset)
  const buyAsset = useAppSelector(selectBuyAsset)
  const receiveAddress = useReceiveAddress()
  const sellAmountCryptoPrecision = useAppSelector(selectSellAmountCryptoPrecision)
  const willDonate = useAppSelector(selectWillDonate)

  const sellAccountId = useAppSelector(selectSellAccountId)

  const sellAccountMetadata = useMemo(() => {
    return selectPortfolioAccountMetadataByAccountId(store.getState(), {
      accountId: sellAccountId,
    })
  }, [sellAccountId])

  // TODO: extract to a constants file
  const DEFAULT_DONATION_BPS = '30'

  useEffect(() => {
    if (wallet && sellAccountMetadata && receiveAddress) {
      ;(async () => {
        const { accountNumber: sellAccountNumber } = sellAccountMetadata.bip44Params

        const updatedTradeQuoteInput: GetTradeQuoteInput | undefined = await getTradeQuoteArgs({
          sellAsset,
          sellAccountNumber,
          sellAccountType: sellAccountMetadata.accountType,
          buyAsset,
          wallet,
          receiveAddress,
          sellAmountBeforeFeesCryptoPrecision: sellAmountCryptoPrecision,
          allowMultiHop: flags.MultiHopTrades,
          affiliateBps: willDonate ? DEFAULT_DONATION_BPS : '0',
        })

        // if the quote input args changed, reset the selected swapper and update the trade quote args
        if (!isEqual(tradeQuoteInput, updatedTradeQuoteInput ?? skipToken)) {
          setTradeQuoteInput(updatedTradeQuoteInput ?? skipToken)
          dispatch(tradeQuoteSlice.actions.resetSwapperName())
        }
      })()
    } else {
      // if the quote input args changed, reset the selected swapper and update the trade quote args
      if (tradeQuoteInput !== skipToken) {
        setTradeQuoteInput(skipToken)
        dispatch(tradeQuoteSlice.actions.resetSwapperName())
      }
    }
  }, [
    buyAsset,
    dispatch,
    flags.MultiHopTrades,
    receiveAddress,
    sellAccountMetadata,
    sellAmountCryptoPrecision,
    sellAsset,
    tradeQuoteInput,
    wallet,
    willDonate,
  ])

  useGetTradeQuoteQuery(debouncedTradeQuoteInput, { pollingInterval: 10000 })
}
