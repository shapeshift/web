import { skipToken } from '@reduxjs/toolkit/dist/query'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { isKeepKey } from '@shapeshiftoss/hdwallet-keepkey'
import { isEqual } from 'lodash'
import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_SWAPPER_DONATION_BPS } from 'components/MultiHopTrade/constants'
import { getTradeQuoteArgs } from 'components/MultiHopTrade/hooks/useGetTradeQuotes/getTradeQuoteArgs'
import { useReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { useDebounce } from 'hooks/useDebounce/useDebounce'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'
import type { GetTradeQuoteInput, SwapperName } from 'lib/swapper/api'
import { isSkipToken, isSome } from 'lib/utils'
import type { ApiQuote } from 'state/apis/swappers'
import { useGetTradeQuoteQuery } from 'state/apis/swappers/swappersApi'
import {
  selectBuyAccountId,
  selectBuyAsset,
  selectPortfolioAccountMetadataByAccountId,
  selectSellAccountId,
  selectSellAmountCryptoPrecision,
  selectSellAsset,
  selectUserSlippagePercentageDecimal,
  selectWillDonate,
} from 'state/slices/selectors'
import {
  selectFirstHopSellAsset,
  selectLastHopBuyAsset,
  selectSellAmountUsd,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { store, useAppDispatch, useAppSelector } from 'state/store'

type MixPanelQuoteMeta = {
  swapperName: SwapperName
  differenceFromBestQuoteDecimalPercentage: number
}

type GetMixPanelDataFromApiQuotesReturn = {
  quoteMeta: MixPanelQuoteMeta[]
  sellAssetId: string | undefined
  buyAssetId: string | undefined
  sellAmountUsd: string | undefined
  version: string // ISO 8601 standard basic format date
}

const getMixPanelDataFromApiQuotes = (quotes: ApiQuote[]): GetMixPanelDataFromApiQuotesReturn => {
  const bestInputOutputRatio = quotes[0]?.inputOutputRatio
  const sellAssetId = selectFirstHopSellAsset(store.getState())?.assetId
  const buyAssetId = selectLastHopBuyAsset(store.getState())?.assetId
  const sellAmountUsd = selectSellAmountUsd(store.getState())
  const quoteMeta: MixPanelQuoteMeta[] = quotes
    .map(({ quote, swapperName, inputOutputRatio }) => {
      const differenceFromBestQuoteDecimalPercentage =
        (inputOutputRatio / bestInputOutputRatio - 1) * -1
      return {
        swapperName,
        differenceFromBestQuoteDecimalPercentage,
        quoteReceived: !!quote,
      }
    })
    .filter(isSome)

  // Add a version string, in the form of an ISO 8601 standard basic format date, to the JSON blob to help with reporting
  const version = '20230823'

  return { quoteMeta, sellAssetId, buyAssetId, sellAmountUsd, version }
}

const isEqualExceptAffiliateBpsAndSlippage = (
  a: GetTradeQuoteInput | typeof skipToken,
  b: GetTradeQuoteInput | undefined,
) => {
  if (!isSkipToken(a) && b) {
    const {
      affiliateBps: _affiliateBps,
      slippageTolerancePercentage: _slippageTolerancePercentage,
      ...aWithoutAffiliateBpsAndSlippage
    } = a

    const {
      affiliateBps: _updatedAffiliateBps,
      slippageTolerancePercentage: _updatedSlippageTolerancePercentage,
      ...bWithoutAffiliateBpsAndSlippage
    } = b

    return isEqual(aWithoutAffiliateBpsAndSlippage, bWithoutAffiliateBpsAndSlippage)
  }
}

export const useGetTradeQuotes = () => {
  const dispatch = useAppDispatch()
  const wallet = useWallet().state.wallet
  const [tradeQuoteInput, setTradeQuoteInput] = useState<GetTradeQuoteInput | typeof skipToken>(
    skipToken,
  )
  const [hasFocus, setHasFocus] = useState(document.hasFocus())
  const debouncedTradeQuoteInput = useDebounce(tradeQuoteInput, 500)
  const sellAsset = useAppSelector(selectSellAsset)
  const buyAsset = useAppSelector(selectBuyAsset)
  const receiveAddress = useReceiveAddress()
  const sellAmountCryptoPrecision = useAppSelector(selectSellAmountCryptoPrecision)
  const userWillDonate = useAppSelector(selectWillDonate)

  const sellAccountId = useAppSelector(selectSellAccountId)
  const buyAccountId = useAppSelector(selectBuyAccountId)

  const userSlippageTolerancePercentage = useAppSelector(selectUserSlippagePercentageDecimal)

  const sellAccountMetadata = useMemo(() => {
    return selectPortfolioAccountMetadataByAccountId(store.getState(), {
      accountId: sellAccountId,
    })
  }, [sellAccountId])

  const receiveAccountMetadata = useMemo(() => {
    return selectPortfolioAccountMetadataByAccountId(store.getState(), {
      accountId: buyAccountId,
    })
  }, [buyAccountId])

  const mixpanel = getMixPanel()

  useEffect(() => {
    if (wallet && sellAccountMetadata && receiveAddress) {
      ;(async () => {
        const { accountNumber: sellAccountNumber } = sellAccountMetadata.bip44Params
        const receiveAssetBip44Params = receiveAccountMetadata?.bip44Params
        const receiveAccountNumber = receiveAssetBip44Params?.accountNumber
        const walletIsKeepKey = wallet && isKeepKey(wallet)
        const isFromEvm = isEvmChainId(sellAsset.chainId)
        // disable EVM donations on KeepKey until https://github.com/shapeshift/web/issues/4518 is resolved
        const willDonate = walletIsKeepKey ? userWillDonate && !isFromEvm : userWillDonate

        const updatedTradeQuoteInput: GetTradeQuoteInput | undefined = await getTradeQuoteArgs({
          sellAsset,
          sellAccountNumber,
          receiveAccountNumber,
          sellAccountType: sellAccountMetadata.accountType,
          buyAsset,
          wallet,
          receiveAddress,
          sellAmountBeforeFeesCryptoPrecision: sellAmountCryptoPrecision,
          allowMultiHop: true,
          affiliateBps: willDonate ? DEFAULT_SWAPPER_DONATION_BPS : '0',
          // Pass in the user's slippage preference if it's set, else let the swapper use its default
          slippageTolerancePercentage: userSlippageTolerancePercentage,
        })

        // if the quote input args changed, reset the selected swapper and update the trade quote args
        if (!isEqual(tradeQuoteInput, updatedTradeQuoteInput ?? skipToken)) {
          updatedTradeQuoteInput && bnOrZero(sellAmountCryptoPrecision).gt(0)
            ? setTradeQuoteInput(updatedTradeQuoteInput)
            : setTradeQuoteInput(skipToken)

          // If only the affiliateBps or the userSlippageTolerancePercentage changed, we've either:
          // - toggled the donation checkbox
          // - switched swappers where one has a different default slippageTolerancePercentage
          // In either case, we don't want to reset the selected swapper
          if (isEqualExceptAffiliateBpsAndSlippage(tradeQuoteInput, updatedTradeQuoteInput)) {
            return
          } else {
            dispatch(tradeQuoteSlice.actions.resetSwapperName())
          }
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
    receiveAddress,
    sellAccountMetadata,
    sellAmountCryptoPrecision,
    sellAsset,
    tradeQuoteInput,
    wallet,
    userWillDonate,
    receiveAccountMetadata?.bip44Params,
    userSlippageTolerancePercentage,
  ])

  useEffect(() => {
    const interval = setInterval(() => {
      setHasFocus(document.hasFocus())
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const { data } = useGetTradeQuoteQuery(debouncedTradeQuoteInput, {
    pollingInterval: hasFocus ? 20000 : undefined,
    /*
      If we don't refresh on arg change might select a cached result with an old "started_at" timestamp
      We can remove refetchOnMountOrArgChange if we want to make better use of the cache, and we have a better way to select from the cache.
     */
    refetchOnMountOrArgChange: true,
  })

  useEffect(() => {
    if (data && mixpanel) {
      const quoteData = getMixPanelDataFromApiQuotes(data)
      mixpanel.track(MixPanelEvents.QuotesReceived, quoteData)
    }
  }, [data, mixpanel])
}
