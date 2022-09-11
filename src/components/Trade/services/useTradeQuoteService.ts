import { skipToken } from '@reduxjs/toolkit/query'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { UtxoBaseAdapter } from '@shapeshiftoss/chain-adapters'
import { type GetTradeQuoteInput, type UtxoSupportedChainIds } from '@shapeshiftoss/swapper'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapperV2'
import {
  getUtxoParams,
  isSupportedNonUtxoSwappingChain,
  isSupportedUtxoSwappingChain,
} from 'components/Trade/hooks/useSwapper/utils'
import { type TradeQuoteInputCommonArgs, type TradeState } from 'components/Trade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { toBaseUnit } from 'lib/math'
import { useGetTradeQuoteQuery } from 'state/apis/swapper/swapperApi'
import { selectAccountSpecifiers, selectFiatToUsdRate } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

/*
The Trade Quote Service is responsible for reacting to changes to trade assets and updating the quote accordingly.
The only mutation is on TradeState's quote property.
*/
export const useTradeQuoteService = () => {
  // Form hooks
  const { control, setValue } = useFormContext<TradeState<KnownChainIds>>()
  const sellTradeAsset = useWatch({ control, name: 'sellTradeAsset' })
  const buyTradeAsset = useWatch({ control, name: 'buyTradeAsset' })
  const sellAssetAccountId = useWatch({ control, name: 'sellAssetAccountId' })
  const amount = useWatch({ control, name: 'amount' })
  const action = useWatch({ control, name: 'action' })

  // Types
  type TradeQuoteQueryInput = Parameters<typeof useGetTradeQuoteQuery>
  type TradeQuoteInputArg = TradeQuoteQueryInput[0]

  // State
  const {
    state: { wallet },
  } = useWallet()
  const [tradeQuoteArgs, setTradeQuoteArgs] = useState<TradeQuoteInputArg>(skipToken)
  const { receiveAddress } = useSwapper()

  // Constants
  const sellAsset = sellTradeAsset?.asset
  const buyAsset = buyTradeAsset?.asset

  // Selectors
  const selectedCurrencyToUsdRate = useAppSelector(selectFiatToUsdRate)
  const accountSpecifiersList = useSelector(selectAccountSpecifiers)

  // API
  const { data: tradeQuote } = useGetTradeQuoteQuery(tradeQuoteArgs, { pollingInterval: 30000 })

  // Effects
  // Trigger trade quote query
  useEffect(() => {
    const sellTradeAssetAmount = sellTradeAsset?.amount
    if (sellAsset && buyAsset && wallet && sellTradeAssetAmount && receiveAddress) {
      ;(async () => {
        const { chainId: receiveAddressChainId } = fromAssetId(buyAsset.assetId)
        const chainAdapter = getChainAdapterManager().get(receiveAddressChainId)

        if (!chainAdapter)
          throw new Error(`couldn't get chain adapter for ${receiveAddressChainId}`)

        const tradeQuoteInputArgs: GetTradeQuoteInput | undefined = await (async () => {
          const tradeQuoteInputCommonArgs: TradeQuoteInputCommonArgs = {
            sellAmount: toBaseUnit(sellTradeAssetAmount, sellAsset.precision),
            sellAsset,
            buyAsset,
            sendMax: false,
            sellAssetAccountNumber: 0,
            receiveAddress,
          }
          if (isSupportedNonUtxoSwappingChain(sellAsset?.chainId)) {
            return {
              ...tradeQuoteInputCommonArgs,
              chainId: sellAsset.chainId,
            }
          } else if (isSupportedUtxoSwappingChain(sellAsset?.chainId) && sellAssetAccountId) {
            const { accountType, utxoParams } = getUtxoParams(sellAssetAccountId)
            if (!utxoParams?.bip44Params) throw new Error('no bip44Params')
            const sellAssetChainAdapter = getChainAdapterManager().get(
              sellAsset.chainId,
            ) as unknown as UtxoBaseAdapter<UtxoSupportedChainIds>
            const { xpub } = await sellAssetChainAdapter.getPublicKey(
              wallet,
              utxoParams.bip44Params,
              accountType,
            )
            return {
              ...tradeQuoteInputCommonArgs,
              chainId: sellAsset.chainId,
              bip44Params: utxoParams.bip44Params,
              accountType,
              xpub,
            }
          }
        })()
        tradeQuoteInputArgs && setTradeQuoteArgs(tradeQuoteInputArgs)
      })()
    }
  }, [
    accountSpecifiersList,
    action,
    amount,
    buyAsset,
    buyTradeAsset,
    receiveAddress,
    selectedCurrencyToUsdRate,
    sellAsset,
    sellAssetAccountId,
    sellTradeAsset,
    setValue,
    wallet,
  ])

  // Set trade quote
  useEffect(() => {
    tradeQuote && setValue('quote', tradeQuote)
  }, [tradeQuote, setValue])
}
