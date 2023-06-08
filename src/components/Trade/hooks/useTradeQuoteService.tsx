import type { SkipToken } from '@reduxjs/toolkit/query'
import { skipToken } from '@reduxjs/toolkit/query'
import { fromAssetId } from '@shapeshiftoss/caip'
import { useEffect, useState } from 'react'
import { getTradeQuoteArgs } from 'components/Trade/hooks/useSwapper/getTradeQuoteArgs'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { type GetTradeQuoteInput } from 'lib/swapper/api'
import {
  selectPortfolioAccountIdsByAssetId,
  selectPortfolioAccountMetadataByAccountId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import {
  selectBuyAsset,
  selectReceiveAddress,
  selectSellAmountCryptoPrecision,
  selectSellAsset,
  selectSellAssetAccountId,
} from 'state/zustand/swapperStore/selectors'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

/*
The Trade Quote Service is responsible for reacting to changes to trade assets and updating the quote accordingly.
The only mutation is on the quote property of SwapperState.
*/
export const useTradeQuoteService = () => {
  // State
  const wallet = useWallet().state.wallet
  const [tradeQuoteArgs, setTradeQuoteArgs] = useState<GetTradeQuoteInput | SkipToken>(skipToken)

  // Selectors
  const receiveAddress = useSwapperStore(selectReceiveAddress)
  const sellAssetAccountId = useSwapperStore(selectSellAssetAccountId)
  const sellAsset = useSwapperStore(selectSellAsset)
  const buyAsset = useSwapperStore(selectBuyAsset)
  const sellAmountCryptoPrecision = useSwapperStore(selectSellAmountCryptoPrecision)

  const sellAssetAccountIds = useAppSelector(state =>
    selectPortfolioAccountIdsByAssetId(state, {
      assetId: sellAsset?.assetId ?? '',
    }),
  )
  const sellAccountFilter = { accountId: sellAssetAccountId ?? sellAssetAccountIds[0] }
  const sellAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, sellAccountFilter),
  )

  // Effects
  // Set trade quote args and trigger trade quote query
  useEffect(() => {
    if (sellAsset && buyAsset && wallet && sellAmountCryptoPrecision && sellAccountMetadata) {
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
        tradeQuoteInputArgs && setTradeQuoteArgs(tradeQuoteInputArgs)
      })()
    }
  }, [buyAsset, receiveAddress, sellAccountMetadata, sellAmountCryptoPrecision, sellAsset, wallet])

  return {
    tradeQuoteArgs: typeof tradeQuoteArgs === 'symbol' ? undefined : tradeQuoteArgs,
  }
}
