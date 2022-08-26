import { skipToken } from '@reduxjs/toolkit/query'
import { ethAssetId, fromAssetId } from '@shapeshiftoss/caip'
import { UtxoBaseAdapter } from '@shapeshiftoss/chain-adapters'
import { type GetTradeQuoteInput, UtxoSupportedChainIds } from '@shapeshiftoss/swapper'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { calculateAmounts } from 'components/Trade/hooks/useSwapper/calculateAmounts'
import {
  type TradeQuoteInputCommonArgs,
  Amounts,
  getFirstReceiveAddress,
  getUtxoParams,
  isSupportedNoneUtxoSwappingChain,
  isSupportedUtxoSwappingChain,
} from 'components/Trade/hooks/useSwapper/utils'
import { type TradeState, TradeAmountInputField } from 'components/Trade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useGetTradeQuoteQuery, useLazyGetUsdRateQuery } from 'state/apis/swapper/swapperApi'
import { selectAccountSpecifiers } from 'state/slices/accountSpecifiersSlice/selectors'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import { selectFiatToUsdRate } from 'state/slices/marketDataSlice/selectors'
import { useAppSelector } from 'state/store'

export const useSwapperService = () => {
  // Form
  const { control, setValue, getValues } = useFormContext<TradeState<KnownChainIds>>()
  const sellTradeAsset = useWatch({ control, name: 'sellTradeAsset' })
  const buyTradeAsset = useWatch({ control, name: 'buyTradeAsset' })
  const sellAssetAccount = useWatch({ control, name: 'sellAssetAccount' })
  const amount = useWatch({ control, name: 'amount' })
  const action = useWatch({ control, name: 'action' })
  const buyAssetFiatRate = useWatch({ control, name: 'buyAssetFiatRate' })
  const sellAssetFiatRate = useWatch({ control, name: 'sellAssetFiatRate' })

  // debug
  console.log('xxx getValues', getValues())

  // Types
  type TradeQuoteQueryInput = Parameters<typeof useGetTradeQuoteQuery>
  type TradeQuoteInputArg = TradeQuoteQueryInput[0]
  type TradeQuoteInputOptions = TradeQuoteQueryInput[1]

  // State
  const {
    state: { wallet },
  } = useWallet()
  const [tradeAmounts, setTradeAmounts] = useState<Amounts | undefined>()
  const [tradeQuoteArgs, setTradeQuoteArgs] = useState<TradeQuoteInputArg>(skipToken)

  // Constants
  const sellAsset = sellTradeAsset?.asset
  const buyAsset = buyTradeAsset?.asset
  const sellTradeAssetId = sellAsset?.assetId
  const buyTradeAssetId = buyAsset?.assetId

  // Selectors
  const selectedCurrencyToUsdRate = useAppSelector(selectFiatToUsdRate)
  const accountSpecifiersList = useSelector(selectAccountSpecifiers)
  const sellAssetFeeAsset = useAppSelector(state =>
    selectFeeAssetById(state, sellTradeAssetId ?? ethAssetId),
  )

  const feeAssetId = sellAssetFeeAsset?.assetId

  // API
  const tradeQuoteOptions: TradeQuoteInputOptions = {
    pollingInterval: 30000,
    refetchOnReconnect: true,
  }

  const { data: tradeQuote } = useGetTradeQuoteQuery(tradeQuoteArgs, tradeQuoteOptions)

  const [buyAssetFiatRateTrigger, buyAssetFiatRateResult] = useLazyGetUsdRateQuery()
  const [sellAssetFiatRateTrigger, sellAssetFiatRateResult] = useLazyGetUsdRateQuery()
  const [feeAssetFiatRateTrigger, feeAssetFiatRateResult] = useLazyGetUsdRateQuery()

  // Effects
  // Trigger fiat rate queries
  useEffect(() => {
    if (sellTradeAssetId && buyTradeAssetId && feeAssetId) {
      buyAssetFiatRateTrigger({
        rateAssetId: buyTradeAssetId!,
        buyAssetId: buyTradeAssetId!,
        sellAssetId: sellTradeAssetId!,
      })
      sellAssetFiatRateTrigger({
        rateAssetId: sellTradeAssetId!,
        buyAssetId: buyTradeAssetId!,
        sellAssetId: sellTradeAssetId!,
      })
      feeAssetFiatRateTrigger({
        rateAssetId: feeAssetId,
        buyAssetId: buyTradeAssetId!,
        sellAssetId: sellTradeAssetId!,
      })
    }
  }, [
    buyAssetFiatRateTrigger,
    buyTradeAssetId,
    feeAssetFiatRateTrigger,
    feeAssetId,
    sellAssetFiatRateTrigger,
    sellTradeAssetId,
  ])

  // Set fiat rates
  useEffect(() => {
    buyAssetFiatRateResult.data?.usdRate &&
      setValue('buyAssetFiatRate', buyAssetFiatRateResult.data?.usdRate)
    sellAssetFiatRateResult.data?.usdRate &&
      setValue('sellAssetFiatRate', sellAssetFiatRateResult.data?.usdRate)
    feeAssetFiatRateResult.data?.usdRate &&
      setValue('feeAssetFiatRate', feeAssetFiatRateResult.data?.usdRate)
  }, [
    buyAssetFiatRateResult.data?.usdRate,
    feeAssetFiatRateResult.data?.usdRate,
    sellAssetFiatRateResult.data?.usdRate,
    setValue,
  ])

  // Get and set trade amounts
  useEffect(() => {
    if (sellAsset && buyAsset && amount) {
      ;(async () => {
        const { sellAmount, buyAmount, fiatSellAmount } = await calculateAmounts({
          amount,
          buyAsset,
          sellAsset,
          buyAssetUsdRate: buyAssetFiatRate,
          sellAssetUsdRate: sellAssetFiatRate,
          action: action ?? TradeAmountInputField.SELL,
          selectedCurrencyToUsdRate,
        })
        setTradeAmounts({ sellAmount, buyAmount, fiatSellAmount })
      })()
    }
  }, [
    action,
    amount,
    buyAsset,
    buyAssetFiatRate,
    buyAssetFiatRateResult?.data?.usdRate,
    feeAssetFiatRateResult?.data?.usdRate,
    selectedCurrencyToUsdRate,
    sellAsset,
    sellAssetFiatRate,
    sellAssetFiatRateResult?.data?.usdRate,
    setValue,
  ])

  // Trigger trade quote query
  useEffect(() => {
    if (sellAsset && buyAsset && wallet && tradeAmounts) {
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
        const tradeQuoteInputArgs: GetTradeQuoteInput | undefined = await (async () => {
          const tradeQuoteInputCommonArgs: TradeQuoteInputCommonArgs = {
            sellAmount: tradeAmounts?.sellAmount,
            sellAsset,
            buyAsset,
            sendMax: false,
            sellAssetAccountNumber: 0,
            receiveAddress,
          }
          if (isSupportedNoneUtxoSwappingChain(sellAsset?.chainId)) {
            return {
              ...tradeQuoteInputCommonArgs,
              chainId: sellAsset.chainId,
            }
          } else if (isSupportedUtxoSwappingChain(sellAsset?.chainId) && sellAssetAccount) {
            const { accountType, utxoParams } = getUtxoParams(sellAssetAccount)
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
    selectedCurrencyToUsdRate,
    sellAsset,
    sellAssetAccount,
    sellTradeAsset,
    setValue,
    tradeAmounts,
    wallet,
  ])

  // Set trade quote
  useEffect(() => {
    tradeQuote && setValue('quote', tradeQuote)
  }, [tradeQuote, setValue])
}
