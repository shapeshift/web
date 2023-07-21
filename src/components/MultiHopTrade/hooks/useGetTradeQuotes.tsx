import { skipToken } from '@reduxjs/toolkit/dist/query'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { isEqual } from 'lodash'
import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_SWAPPER_DONATION_BPS } from 'components/MultiHopTrade/constants'
import { useReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { getTradeQuoteArgs } from 'components/Trade/hooks/useSwapper/getTradeQuoteArgs'
import { useDebounce } from 'hooks/useDebounce/useDebounce'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { GetTradeQuoteInput } from 'lib/swapper/api'
import { isSkipToken } from 'lib/utils'
import { useGetTradeQuoteQuery } from 'state/apis/swappers/swappersApi'
import {
  selectBuyAccountId,
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

const isEqualExceptAffiliateBps = (
  a: GetTradeQuoteInput | typeof skipToken,
  b: GetTradeQuoteInput | undefined,
) => {
  if (!isSkipToken(a) && b) {
    const { affiliateBps: _affiliateBps, ...aWithoutAffiliateBps } = a
    const { affiliateBps: _updatedAffiliateBps, ...bWithoutAffiliateBps } = b
    return isEqual(aWithoutAffiliateBps, bWithoutAffiliateBps)
  }
}

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
  const buyAccountId = useAppSelector(selectBuyAccountId)

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

  useEffect(() => {
    if (wallet && sellAccountMetadata && receiveAddress) {
      ;(async () => {
        const { accountNumber: sellAccountNumber } = sellAccountMetadata.bip44Params
        const receiveAssetBip44Params = receiveAccountMetadata?.bip44Params
        const receiveAccountNumber = receiveAssetBip44Params?.accountNumber
        const walletIsKeepKey = wallet && wallet.getVendor() === 'KeepKey'
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
          allowMultiHop: flags.MultiHopTrades,
          affiliateBps: willDonate ? DEFAULT_SWAPPER_DONATION_BPS : '0',
        })

        // if the quote input args changed, reset the selected swapper and update the trade quote args
        if (!isEqual(tradeQuoteInput, updatedTradeQuoteInput ?? skipToken)) {
          setTradeQuoteInput(updatedTradeQuoteInput ?? skipToken)

          // If only the affiliateBps changed, we've toggled the donation checkbox - don't reset the swapper name
          if (isEqualExceptAffiliateBps(tradeQuoteInput, updatedTradeQuoteInput)) {
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
    flags.MultiHopTrades,
    receiveAddress,
    sellAccountMetadata,
    sellAmountCryptoPrecision,
    sellAsset,
    tradeQuoteInput,
    wallet,
    userWillDonate,
    receiveAccountMetadata?.bip44Params,
  ])

  useGetTradeQuoteQuery(debouncedTradeQuoteInput, {
    pollingInterval: 20000,
    /*
      If we don't refresh on arg change might select a cached result with an old "started_at" timestamp
      We can remove refetchOnMountOrArgChange if we want to make better use of the cache, and we have a better way to select from the cache.
     */
    refetchOnMountOrArgChange: true,
  })
}
