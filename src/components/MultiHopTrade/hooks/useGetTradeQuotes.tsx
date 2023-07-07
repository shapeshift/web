import { skipToken } from '@reduxjs/toolkit/dist/query'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { isKeepKey } from '@shapeshiftoss/hdwallet-keepkey'
import { isEqual } from 'lodash'
import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_DONATION_BPS } from 'components/MultiHopTrade/constants'
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
  const userWillDonate = useAppSelector(selectWillDonate)

  const sellAccountId = useAppSelector(selectSellAccountId)

  const sellAccountMetadata = useMemo(() => {
    return selectPortfolioAccountMetadataByAccountId(store.getState(), {
      accountId: sellAccountId,
    })
  }, [sellAccountId])

  useEffect(() => {
    if (wallet && sellAccountMetadata && receiveAddress) {
      ;(async () => {
        const { accountNumber: sellAccountNumber } = sellAccountMetadata.bip44Params
        const walletIsKeepKey = wallet && isKeepKey(wallet)
        const isFromEvm = isEvmChainId(sellAsset.chainId)
        const shouldDonate = walletIsKeepKey ? userWillDonate && !isFromEvm : userWillDonate

        const updatedTradeQuoteInput: GetTradeQuoteInput | undefined = await getTradeQuoteArgs({
          sellAsset,
          sellAccountNumber,
          sellAccountType: sellAccountMetadata.accountType,
          buyAsset,
          wallet,
          receiveAddress,
          sellAmountBeforeFeesCryptoPrecision: sellAmountCryptoPrecision,
          allowMultiHop: flags.MultiHopTrades,
          affiliateBps: shouldDonate ? DEFAULT_DONATION_BPS : '0',
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
    userWillDonate,
  ])

  useGetTradeQuoteQuery(debouncedTradeQuoteInput, { pollingInterval: 10000 })
}
