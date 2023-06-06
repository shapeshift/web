import { skipToken } from '@reduxjs/toolkit/dist/query'
import { fromAssetId } from '@shapeshiftoss/caip'
import { useEffect, useState } from 'react'
import { getTradeQuoteArgs } from 'components/Trade/hooks/useSwapper/getTradeQuoteArgs'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
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
import { useAppSelector } from 'state/store'

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

  const sellAssetAccountIds = useAppSelector(state =>
    selectPortfolioAccountIdsByAssetId(state, {
      assetId: sellAsset.assetId,
    }),
  )
  const sellAccountFilter = { accountId: sellAssetAccountId ?? sellAssetAccountIds[0] }
  const sellAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, sellAccountFilter),
  )

  useEffect(() => {
    if (wallet && sellAccountMetadata) {
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
          sellAmountBeforeFeesCryptoPrecision: sellAmountCryptoPrecision,
        })
        setTradeQuoteInput(tradeQuoteInputArgs ?? skipToken)
      })()
    } else {
      setTradeQuoteInput(skipToken)
    }
  }, [buyAsset, receiveAddress, sellAccountMetadata, sellAmountCryptoPrecision, sellAsset, wallet])

  const { isLoading, data, error } = useGetLifiTradeQuoteQuery(tradeQuoteInput, {
    skip: !isLifiEnabled,
  })

  if (isSkipToken(tradeQuoteInput)) return {}

  return {
    [SwapperName.LIFI]: { isLoading, data, error },
  }
}
