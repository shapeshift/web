import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { useCallback } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { calculateAmounts } from 'components/Trade/hooks/useSwapper/calculateAmounts'
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapperV2'
import { getFormFees } from 'components/Trade/hooks/useSwapper/utils'
import { getTradeQuoteArgs } from 'components/Trade/hooks/useTradeQuoteService'
import type { DisplayFeeData, TS } from 'components/Trade/types'
import type { TradeAmountInputField } from 'components/Trade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { swapperApi } from 'state/apis/swapper/swapperApi'
import { selectAccountSpecifiers, selectAssets, selectFiatToUsdRate } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

export const useTradeAmounts = () => {
  // Form hooks
  const { control, setValue, setError, clearErrors } = useFormContext<TS>()
  const buyAssetFiatRateFormState = useWatch({ control, name: 'buyAssetFiatRate' })
  const sellAssetFiatRateFormState = useWatch({ control, name: 'sellAssetFiatRate' })
  const sellTradeAsset = useWatch({ control, name: 'sellTradeAsset' })
  const buyTradeAsset = useWatch({ control, name: 'buyTradeAsset' })
  const feesFormState = useWatch({ control, name: 'fees' })
  const amountFormState = useWatch({ control, name: 'amount' })
  const actionFormState = useWatch({ control, name: 'action' })

  const dispatch = useAppDispatch()
  const { swapperManager, getReceiveAddressFromBuyAsset } = useSwapper()
  const {
    state: { wallet },
  } = useWallet()
  const accountSpecifiersList = useSelector(selectAccountSpecifiers)

  // Types
  type SetTradeAmountsArgs = {
    amount?: string | null
    action?: TradeAmountInputField
    buyAsset?: Asset
    sellAsset?: Asset
    buyAssetUsdRate?: string
    sellAssetUsdRate?: string
    fees?: DisplayFeeData<KnownChainIds>
  }

  type ValidateAmountsArgs = {
    buyTradeAssetAmount: string
    sellTradeAssetAmount: string
  }

  type SetTradeAmountsOnAssetChangeArgs = {
    sellAssetId?: AssetId
    buyAssetId?: AssetId
    sellAmount: string
    sellAction: TradeAmountInputField.SELL_CRYPTO | TradeAmountInputField.SELL_FIAT
  }

  // Selectors
  const selectedCurrencyToUsdRate = useAppSelector(selectFiatToUsdRate)

  // Constants
  const sellAssetFormState = sellTradeAsset?.asset
  const buyAssetFormState = buyTradeAsset?.asset

  const validateAmounts = useCallback(
    ({ buyTradeAssetAmount, sellTradeAssetAmount }: ValidateAmountsArgs) => {
      const sellAmountsDoesNotCoverFees =
        bnOrZero(buyTradeAssetAmount).isZero() && bnOrZero(sellTradeAssetAmount).isGreaterThan(0)
      sellAmountsDoesNotCoverFees
        ? setError('buyTradeAsset.amount', {
            type: 'manual',
            message: 'trade.errors.sellAmountDoesNotCoverFee',
          })
        : clearErrors('buyTradeAsset.amount')
    },
    [clearErrors, setError],
  )

  const { getUsdRates, getTradeQuote } = swapperApi.endpoints
  const assets = useSelector(selectAssets)

  // Use the form state, or optionally override with args
  const setTradeAmounts = useCallback(
    ({
      amount = amountFormState,
      action = actionFormState,
      buyAsset = buyAssetFormState,
      sellAsset = sellAssetFormState,
      buyAssetUsdRate = buyAssetFiatRateFormState,
      sellAssetUsdRate = sellAssetFiatRateFormState,
      fees = feesFormState,
    }: SetTradeAmountsArgs) => {
      const tradeFee = bnOrZero(fees?.tradeFee).div(bnOrZero(buyAssetFiatRateFormState))
      if (sellAsset && buyAsset && amount && action) {
        const { cryptoSellAmount, cryptoBuyAmount, fiatSellAmount, fiatBuyAmount } =
          calculateAmounts({
            amount,
            action,
            buyAsset,
            sellAsset,
            buyAssetUsdRate,
            sellAssetUsdRate,
            selectedCurrencyToUsdRate,
            tradeFee,
          })
        const buyTradeAssetAmount = fromBaseUnit(cryptoBuyAmount, buyAsset.precision)
        const sellTradeAssetAmount = fromBaseUnit(cryptoSellAmount, sellAsset.precision)
        validateAmounts({ buyTradeAssetAmount, sellTradeAssetAmount })
        setValue('fiatSellAmount', fiatSellAmount)
        setValue('fiatBuyAmount', fiatBuyAmount)
        setValue('buyTradeAsset.amount', buyTradeAssetAmount)
        setValue('sellTradeAsset.amount', sellTradeAssetAmount)
      }
    },
    [
      amountFormState,
      actionFormState,
      buyAssetFormState,
      sellAssetFormState,
      buyAssetFiatRateFormState,
      sellAssetFiatRateFormState,
      feesFormState,
      selectedCurrencyToUsdRate,
      validateAmounts,
      setValue,
    ],
  )

  const getFirstAccountIdFromChainId = useCallback(
    (chainId: ChainId) => {
      const accountSpecifiers = accountSpecifiersList.find(specifiers => specifiers[chainId])
      return accountSpecifiers?.[chainId]
    },
    [accountSpecifiersList],
  )

  const setTradeAmountsOnAssetChange = useCallback(
    async ({
      sellAssetId,
      buyAssetId,
      sellAmount,
      sellAction,
    }: SetTradeAmountsOnAssetChangeArgs) => {
      const buyAssetIdToUse = buyAssetId ?? buyAssetFormState?.assetId
      const sellAssetIdToUse = sellAssetId ?? sellAssetFormState?.assetId
      if (!buyAssetIdToUse || !sellAssetIdToUse || !wallet) return
      const buyAsset = assets[buyAssetIdToUse]
      const feeAssetId = getChainAdapterManager().get(buyAsset.chainId)?.getFeeAssetId()
      if (!feeAssetId) return
      const feeAsset = assets[feeAssetId]
      const sellAsset = assets[sellAssetIdToUse]
      const receiveAddress = await getReceiveAddressFromBuyAsset(buyAsset)
      if (!receiveAddress) return

      const bestTradeSwapper = await swapperManager.getBestSwapper({
        buyAssetId: buyAssetIdToUse,
        sellAssetId: sellAssetIdToUse,
      })

      if (!bestTradeSwapper) return
      const sellAssetAccountId = getFirstAccountIdFromChainId(sellAsset.chainId)
      if (!sellAssetAccountId) return

      const tradeQuoteArgs = await getTradeQuoteArgs({
        buyAsset,
        sellAsset,
        sellAssetAccountId,
        wallet,
        receiveAddress,
        sellAmount,
      })

      if (!tradeQuoteArgs) return
      const { data: quote } = await dispatch(getTradeQuote.initiate(tradeQuoteArgs))
      if (!quote) return

      const formFees = getFormFees({
        trade: quote,
        sellAsset: assets[sellAssetIdToUse],
        tradeFeeSource: bestTradeSwapper.name,
        feeAsset,
      })
      const { data: usdRates } = await dispatch(
        getUsdRates.initiate({
          buyAssetId: buyAssetIdToUse,
          sellAssetId: sellAssetIdToUse,
          feeAssetId,
        }),
      )
      usdRates &&
        setTradeAmounts({
          amount: sellAmount,
          action: sellAction,
          buyAsset,
          sellAsset,
          buyAssetUsdRate: usdRates.buyAssetUsdRate,
          sellAssetUsdRate: usdRates.sellAssetUsdRate,
          fees: formFees,
        })
    },
    [
      assets,
      buyAssetFormState?.assetId,
      dispatch,
      getFirstAccountIdFromChainId,
      getReceiveAddressFromBuyAsset,
      getTradeQuote,
      getUsdRates,
      sellAssetFormState?.assetId,
      setTradeAmounts,
      swapperManager,
      wallet,
    ],
  )

  return { setTradeAmounts, setTradeAmountsOnAssetChange }
}
