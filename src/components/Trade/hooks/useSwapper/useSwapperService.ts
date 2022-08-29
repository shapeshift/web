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
  getFirstReceiveAddress,
  getUtxoParams,
  isSupportedNoneUtxoSwappingChain,
  isSupportedUtxoSwappingChain,
} from 'components/Trade/hooks/useSwapper/utils'
import { type TradeState, TradeAmountInputField } from 'components/Trade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { fromBaseUnit } from 'lib/math'
import {
  GetUsdRateArgs,
  useGetTradeQuoteQuery,
  useGetUsdRateQuery,
} from 'state/apis/swapper/swapperApi'
import { selectAccountSpecifiers } from 'state/slices/accountSpecifiersSlice/selectors'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import { selectFiatToUsdRate } from 'state/slices/marketDataSlice/selectors'
import { useAppSelector } from 'state/store'

/*
The Swapper Service is responsible for reacting to changes to the Trade form and updating state accordingly.
It will reactively:
- Fetch and poll for trade quotes
- Fetch and poll for USD rates
- Fetch trade amounts (buy and sell)
*/
export const useSwapperService = () => {
  // Form hooks
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

  type UsdRateQueryInput = Parameters<typeof useGetUsdRateQuery>
  type UsdRateInputArg = UsdRateQueryInput[0]

  // State
  const {
    state: { wallet },
  } = useWallet()
  const [tradeQuoteArgs, setTradeQuoteArgs] = useState<TradeQuoteInputArg>(skipToken)
  const [buyAssetFiatRateArgs, setBuyAssetFiatRateArgs] = useState<UsdRateInputArg>(skipToken)
  const [sellAssetFiatRateArgs, setSellAssetFiatRateArgs] = useState<UsdRateInputArg>(skipToken)
  const [feeAssetFiatRateArgs, setFeeAssetFiatRateArgs] = useState<UsdRateInputArg>(skipToken)

  // Constants
  const sellAsset = sellTradeAsset?.asset
  const buyAsset = buyTradeAsset?.asset
  const sellTradeAssetId = sellAsset?.assetId
  const buyTradeAssetId = buyAsset?.assetId

  // Selectors
  const selectedCurrencyToUsdRate = useAppSelector(selectFiatToUsdRate)
  const accountSpecifiersList = useSelector(selectAccountSpecifiers)
  const sellAssetFeeAssetId = useAppSelector(state =>
    selectFeeAssetById(state, sellTradeAssetId ?? ethAssetId),
  ).assetId

  // API
  const { data: tradeQuote } = useGetTradeQuoteQuery(tradeQuoteArgs, { pollingInterval: 30000 })

  const { data: buyAssetFiatRateData } = useGetUsdRateQuery(buyAssetFiatRateArgs, {
    pollingInterval: 30000,
    selectFromResult: ({ data }) => ({
      data: data?.usdRate,
    }),
  })
  const { data: sellAssetFiatRateData } = useGetUsdRateQuery(sellAssetFiatRateArgs, {
    pollingInterval: 30000,
    selectFromResult: ({ data }) => ({
      data: data?.usdRate,
    }),
  })
  const { data: feeAssetFiatRateData } = useGetUsdRateQuery(feeAssetFiatRateArgs, {
    pollingInterval: 30000,
    selectFromResult: ({ data }) => ({
      data: data?.usdRate,
    }),
  })

  // Effects
  // Trigger fiat rate queries
  useEffect(() => {
    if (sellTradeAssetId && buyTradeAssetId && sellAssetFeeAssetId) {
      const fiatArgsCommon: Pick<GetUsdRateArgs, 'buyAssetId' | 'sellAssetId'> = {
        buyAssetId: buyTradeAssetId!,
        sellAssetId: sellTradeAssetId!,
      }
      setBuyAssetFiatRateArgs({
        ...fiatArgsCommon,
        rateAssetId: buyTradeAssetId!,
      })
      setSellAssetFiatRateArgs({
        ...fiatArgsCommon,
        rateAssetId: sellTradeAssetId!,
      })
      setFeeAssetFiatRateArgs({
        ...fiatArgsCommon,
        rateAssetId: sellAssetFeeAssetId,
      })
    }
  }, [buyTradeAssetId, sellAssetFeeAssetId, sellTradeAssetId])

  // Set fiat rates
  useEffect(() => {
    buyAssetFiatRateData && setValue('buyAssetFiatRate', buyAssetFiatRateData)
    sellAssetFiatRateData && setValue('sellAssetFiatRate', sellAssetFiatRateData)
    feeAssetFiatRateData && setValue('feeAssetFiatRate', feeAssetFiatRateData)
  }, [buyAssetFiatRateData, feeAssetFiatRateData, sellAssetFiatRateData, setValue])

  // Get and set trade amounts
  useEffect(() => {
    if (sellAsset && buyAsset && amount) {
      ;(async () => {
        const { cryptoSellAmount, cryptoBuyAmount, fiatSellAmount, fiatBuyAmount } =
          calculateAmounts({
            amount,
            buyAsset,
            sellAsset,
            buyAssetUsdRate: buyAssetFiatRate,
            sellAssetUsdRate: sellAssetFiatRate,
            action: action ?? TradeAmountInputField.SELL_CRYPTO,
            selectedCurrencyToUsdRate,
          })
        setValue('fiatSellAmount', fiatSellAmount)
        setValue('fiatBuyAmount', fiatBuyAmount)
        setValue('buyTradeAsset.amount', fromBaseUnit(cryptoBuyAmount, buyAsset.precision))
        setValue('sellTradeAsset.amount', fromBaseUnit(cryptoSellAmount, sellAsset.precision))
      })()
    }
  }, [
    action,
    amount,
    buyAsset,
    buyAssetFiatRate,
    selectedCurrencyToUsdRate,
    sellAsset,
    sellAssetFiatRate,
    setValue,
  ])

  // Trigger trade quote query
  useEffect(() => {
    const sellTradeAssetAmount = sellTradeAsset?.amount
    if (sellAsset && buyAsset && wallet && sellTradeAssetAmount) {
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
            sellAmount: sellTradeAssetAmount,
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
    wallet,
  ])

  // Set trade quote
  useEffect(() => {
    tradeQuote && setValue('quote', tradeQuote)
  }, [tradeQuote, setValue])
}
