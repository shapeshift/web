import type { AssetId } from '@keepkey/caip'
import type { KnownChainIds } from '@keepkey/types'
import { useCallback } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useSelector } from 'react-redux'
import type { CalculateAmountsArgs } from 'components/Trade/hooks/useSwapper/calculateAmounts'
import { calculateAmounts } from 'components/Trade/hooks/useSwapper/calculateAmounts'
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapperV2'
import { getFormFees } from 'components/Trade/hooks/useSwapper/utils'
import { getTradeQuoteArgs } from 'components/Trade/hooks/useTradeQuoteService'
import type { DisplayFeeData, TS } from 'components/Trade/types'
import { TradeAmountInputField } from 'components/Trade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { swapperApi } from 'state/apis/swapper/swapperApi'
import {
  selectAssets,
  selectFiatToUsdRate,
  selectPortfolioAccountIdsByAssetId,
  selectPortfolioAccountMetadataByAccountId,
} from 'state/slices/selectors'
import { store, useAppDispatch, useAppSelector } from 'state/store'

export const useTradeAmounts = () => {
  // Form hooks
  const { control, setValue } = useFormContext<TS>()
  const buyAssetFiatRateFormState = useWatch({ control, name: 'buyAssetFiatRate' })
  const sellAssetFiatRateFormState = useWatch({ control, name: 'sellAssetFiatRate' })
  const sellTradeAsset = useWatch({ control, name: 'sellTradeAsset' })
  const buyTradeAsset = useWatch({ control, name: 'buyTradeAsset' })
  const feesFormState = useWatch({ control, name: 'fees' })
  const amountFormState = useWatch({ control, name: 'amount' })
  const actionFormState = useWatch({ control, name: 'action' })
  const isSendMaxFormState = useWatch({ control, name: 'isSendMax' })

  const dispatch = useAppDispatch()
  const { swapperManager, getReceiveAddressFromBuyAsset } = useSwapper()
  const {
    state: { wallet },
  } = useWallet()

  // Types
  type SetTradeAmountsAsynchronousArgs = Omit<Partial<CalculateAmountsArgs>, 'tradeFee'> & {
    fees?: DisplayFeeData<KnownChainIds>
  }

  type SetTradeAmountsSynchronousArgs = {
    sellAssetId?: AssetId
    buyAssetId?: AssetId
    amount?: string
    action?: TradeAmountInputField
    sendMax?: boolean
  }
  type SetTradeAmountsArgs = CalculateAmountsArgs

  // Selectors
  const selectedCurrencyToUsdRate = useAppSelector(selectFiatToUsdRate)

  // Constants
  const sellAssetFormState = sellTradeAsset?.asset
  const buyAssetFormState = buyTradeAsset?.asset

  const { getUsdRates, getTradeQuote } = swapperApi.endpoints
  const assets = useSelector(selectAssets)

  const setTradeAmounts = useCallback(
    (args: SetTradeAmountsArgs) => {
      const {
        sellAmountSellAssetBaseUnit,
        buyAmountBuyAssetBaseUnit,
        fiatSellAmount,
        fiatBuyAmount,
      } = calculateAmounts(args)
      const buyTradeAssetAmount = fromBaseUnit(buyAmountBuyAssetBaseUnit, args.buyAsset.precision)
      const sellTradeAssetAmount = fromBaseUnit(
        sellAmountSellAssetBaseUnit,
        args.sellAsset.precision,
      )
      setValue('fiatSellAmount', fiatSellAmount)
      setValue('fiatBuyAmount', fiatBuyAmount)
      setValue('buyTradeAsset.amount', buyTradeAssetAmount)
      setValue('sellTradeAsset.amount', sellTradeAssetAmount)
    },
    [setValue],
  )

  // Use the existing fiat rates and quote without waiting for fresh data
  const setTradeAmountsUsingExistingData = useCallback(
    (args: SetTradeAmountsAsynchronousArgs) => {
      const amount = args.amount ?? amountFormState
      const action = args.action ?? actionFormState
      const buyAsset = args.buyAsset ?? buyAssetFormState
      const sellAsset = args.sellAsset ?? sellAssetFormState
      const buyAssetUsdRate = args.buyAssetUsdRate ?? buyAssetFiatRateFormState
      const sellAssetUsdRate = args.sellAssetUsdRate ?? sellAssetFiatRateFormState
      const fees = args.fees ?? feesFormState
      if (sellAsset && buyAsset && amount && action && buyAssetUsdRate && sellAssetUsdRate) {
        setTradeAmounts({
          amount,
          action,
          buyAsset,
          sellAsset,
          buyAssetUsdRate,
          sellAssetUsdRate,
          selectedCurrencyToUsdRate,
          buyAssetTradeFeeUsd: bnOrZero(fees?.buyAssetTradeFeeUsd),
          sellAssetTradeFeeUsd: bnOrZero(fees?.sellAssetTradeFeeUsd),
        })
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
      setTradeAmounts,
      selectedCurrencyToUsdRate,
    ],
  )

  // Use the args provided to get new fiat rates and a fresh quote
  // Useful when changing assets where we expect response data to meaningfully change - so wait before updating amounts
  const setTradeAmountsRefetchData = useCallback(
    async ({
      sellAssetId,
      buyAssetId,
      amount,
      action,
      sendMax,
    }: SetTradeAmountsSynchronousArgs) => {
      // Eagerly update the input field to improve UX whilst we wait for API responses
      switch (action) {
        case TradeAmountInputField.SELL_FIAT:
        case TradeAmountInputField.SELL_CRYPTO:
          setValue('sellTradeAsset.amount', amount)
          break
        case TradeAmountInputField.BUY_FIAT:
        case TradeAmountInputField.BUY_CRYPTO:
          setValue('buyTradeAsset.amount', amount)
          break
        default:
          break
      }

      const buyAssetIdToUse = buyAssetId ?? buyAssetFormState?.assetId
      const sellAssetIdToUse = sellAssetId ?? sellAssetFormState?.assetId
      const amountToUse = amount ?? amountFormState
      const actionToUse = action ?? actionFormState ?? TradeAmountInputField.SELL_CRYPTO
      if (!buyAssetIdToUse || !sellAssetIdToUse || !wallet) return
      const sellAsset = assets[sellAssetIdToUse]
      const buyAsset = assets[buyAssetIdToUse]
      const feeAssetId = getChainAdapterManager().get(sellAsset.chainId)?.getFeeAssetId()
      if (!feeAssetId) return
      const feeAsset = assets[feeAssetId]
      const receiveAddress = await getReceiveAddressFromBuyAsset(buyAsset)
      if (!receiveAddress) return

      const bestTradeSwapper = await swapperManager.getBestSwapper({
        buyAssetId: buyAssetIdToUse,
        sellAssetId: sellAssetIdToUse,
      })

      if (!bestTradeSwapper) {
        setValue('quote', undefined)
        setValue('fees', undefined)
        return
      }
      const state = store.getState()
      const sellAssetAccountIds = selectPortfolioAccountIdsByAssetId(state, {
        assetId: sellAsset.assetId,
      })
      const sellAccountFilter = { accountId: sellAssetAccountIds[0] }
      const sellAccountMetadata = selectPortfolioAccountMetadataByAccountId(
        state,
        sellAccountFilter,
      )

      if (!sellAccountMetadata) return // no-op, need at least bip44Params to get tradeQuoteArgs

      const tradeQuoteArgs = await getTradeQuoteArgs({
        buyAsset,
        sellAsset,
        sellAccountType: sellAccountMetadata.accountType,
        sellAccountBip44Params: sellAccountMetadata.bip44Params,
        wallet,
        receiveAddress,
        sellAmount: sellTradeAsset?.amount || amountToUse || '0',
        isSendMax: sendMax ?? isSendMaxFormState,
      })

      const quoteResponse = tradeQuoteArgs
        ? await dispatch(getTradeQuote.initiate(tradeQuoteArgs))
        : undefined

      // If we can't get a quote our trade fee will be 0 - this is likely not desired long-term
      const formFees = quoteResponse?.data
        ? getFormFees({
            trade: quoteResponse.data,
            sellAsset: assets[sellAssetIdToUse],
            tradeFeeSource: bestTradeSwapper.name,
            feeAsset,
          })
        : undefined

      const { data: usdRates } = await dispatch(
        getUsdRates.initiate({
          buyAssetId: buyAssetIdToUse,
          sellAssetId: sellAssetIdToUse,
          feeAssetId,
        }),
      )

      if (usdRates) {
        setValue('quote', quoteResponse?.data)
        setValue('fees', formFees)
        setTradeAmounts({
          amount: amountToUse,
          action: actionToUse,
          buyAsset,
          sellAsset,
          buyAssetUsdRate: usdRates.buyAssetUsdRate,
          sellAssetUsdRate: usdRates.sellAssetUsdRate,
          selectedCurrencyToUsdRate,
          buyAssetTradeFeeUsd: bnOrZero(formFees?.buyAssetTradeFeeUsd),
          sellAssetTradeFeeUsd: bnOrZero(formFees?.sellAssetTradeFeeUsd),
        })
      } else {
        setValue('sellAssetFiatRate', undefined)
        setValue('buyAssetFiatRate', undefined)
        setValue('feeAssetFiatRate', undefined)
        setValue('fees', undefined)
      }
    },
    [
      actionFormState,
      amountFormState,
      assets,
      buyAssetFormState?.assetId,
      dispatch,
      getReceiveAddressFromBuyAsset,
      getTradeQuote,
      getUsdRates,
      isSendMaxFormState,
      selectedCurrencyToUsdRate,
      sellAssetFormState?.assetId,
      sellTradeAsset?.amount,
      setTradeAmounts,
      setValue,
      swapperManager,
      wallet,
    ],
  )

  return {
    setTradeAmountsUsingExistingData,
    setTradeAmountsRefetchData,
  }
}
