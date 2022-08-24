import { fromAssetId } from '@shapeshiftoss/caip'
import { GetTradeQuoteInput } from '@shapeshiftoss/swapper'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useEffect } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useSelector } from 'react-redux'
import {
  getFirstReceiveAddress,
  isSupportedSwappingChain,
} from 'components/Trade/hooks/useSwapper/utils'
import { TradeState } from 'components/Trade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useLazyGetTradeQuoteQuery } from 'state/apis/swapper/swapperApi'
import { selectAccountSpecifiers } from 'state/slices/accountSpecifiersSlice/selectors'
import { selectFiatToUsdRate } from 'state/slices/marketDataSlice/selectors'
import { useAppSelector } from 'state/store'

type Amounts = {
  sellAmount: string
  buyAmount: string
  fiatSellAmount: string
}

export const useSwapper = () => {
  // Form
  const { control } = useFormContext<TradeState<KnownChainIds>>()
  const sellTradeAsset = useWatch({ control, name: 'sellTradeAsset' })
  const buyTradeAsset = useWatch({ control, name: 'buyTradeAsset' })
  const amount = useWatch({ control, name: 'amount' })
  const action = useWatch({ control, name: 'action' })

  // State
  const {
    state: { wallet },
  } = useWallet()

  // Selectors
  const selectedCurrencyToUsdRate = useAppSelector(selectFiatToUsdRate)
  const accountSpecifiersList = useSelector(selectAccountSpecifiers)

  // API
  const [getTradeQuoteTrigger, getTradeQuoteResult, getTradeQuoteLastInfo] =
    useLazyGetTradeQuoteQuery()

  // Effects
  // TODO: A useEffect to handle calculateAmounts logic
  // consumes selectedCurrencyToUsdRate

  useEffect(() => {
    const sellAsset = sellTradeAsset?.asset
    const buyAsset = buyTradeAsset?.asset
    const hasRequiredDataForTradeQuote = sellAsset && buyAsset && wallet
    if (hasRequiredDataForTradeQuote) {
      ;(async () => {
        const { chainId: receiveAddressChainId } = fromAssetId(buyAsset.assetId)
        const chainAdapter = getChainAdapterManager().get(receiveAddressChainId)

        if (!chainAdapter)
          throw new Error(`couldn't get chain adapter for ${receiveAddressChainId}`)

        const receiveAddress = await getFirstReceiveAddress({
          accountSpecifiersList,
          buyAsset,
          chainAdapter,
          wallet,
        })
        const tradeQuoteInputArgs: GetTradeQuoteInput | undefined = (() => {
          const tradeQuoteInputArgsCommon: Pick<
            GetTradeQuoteInput,
            | 'sellAmount'
            | 'sellAsset'
            | 'buyAsset'
            | 'sendMax'
            | 'sellAssetAccountNumber'
            | 'wallet'
            | 'receiveAddress'
          > = {
            sellAmount: '0', // TODO: calculateAmounts
            sellAsset: sellAsset!,
            buyAsset: buyAsset!,
            sendMax: false,
            sellAssetAccountNumber: 0,
            wallet,
            receiveAddress,
          }
          if (isSupportedSwappingChain(sellAsset?.chainId)) {
            return {
              ...tradeQuoteInputArgsCommon,
              chainId: sellAsset.chainId,
            }
          }
        })()
        tradeQuoteInputArgs && getTradeQuoteTrigger(tradeQuoteInputArgs)
      })()
    }
  }, [
    accountSpecifiersList,
    action,
    amount,
    buyTradeAsset,
    getTradeQuoteTrigger,
    selectedCurrencyToUsdRate,
    sellTradeAsset,
    wallet,
  ])
}
