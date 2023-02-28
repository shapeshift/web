import type { AssetId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { useCallback } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { useReceiveAddress } from 'components/Trade/hooks/useReceiveAddress'
import type { CalculateAmountsArgs } from 'components/Trade/hooks/useSwapper/calculateAmounts'
import { calculateAmounts } from 'components/Trade/hooks/useSwapper/calculateAmounts'
import { getTradeQuoteArgs } from 'components/Trade/hooks/useSwapper/getTradeQuoteArgs'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import { getFormFees } from 'components/Trade/hooks/useSwapper/utils'
import { SwapperActionType, useSwapperState } from 'components/Trade/swapperProvider'
import type { DisplayFeeData, TS } from 'components/Trade/types'
import { TradeAmountInputField } from 'components/Trade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { getSwappersApi } from 'state/apis/swapper/getSwappersApi'
import { getTradeQuoteApi } from 'state/apis/swapper/getTradeQuoteApi'
import { getUsdRatesApi } from 'state/apis/swapper/getUsdRatesApi'
import {
  selectAssets,
  selectFeatureFlags,
  selectFiatToUsdRate,
  selectPortfolioAccountIdsByAssetId,
  selectPortfolioAccountMetadataByAccountId,
} from 'state/slices/selectors'
import { store, useAppDispatch, useAppSelector } from 'state/store'

export const useTradeAmounts = () => {
  // Form hooks
  const { control, setValue } = useFormContext<TS>()
  const feesFormState = useWatch({ control, name: 'fees' })
  const amountFormState = useWatch({ control, name: 'amount' })
  const actionFormState = useWatch({ control, name: 'action' })
  const isSendMaxFormState = useWatch({ control, name: 'isSendMax' })

  // Hooks
  const featureFlags = useAppSelector(selectFeatureFlags)
  const appDispatch = useAppDispatch()
  const {
    dispatch: swapperDispatch,
    buyAssetFiatRate: buyAssetFiatRateFormState,
    sellAssetFiatRate: sellAssetFiatRateFormState,
    sellTradeAsset,
    buyTradeAsset,
  } = useSwapperState()
  const { getReceiveAddressFromBuyAsset } = useReceiveAddress()
  const wallet = useWallet().state.wallet

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
  const assets = useSelector(selectAssets)

  // Constants
  const sellAssetFormState = sellTradeAsset?.asset
  const buyAssetFormState = buyTradeAsset?.asset

  const { getTradeQuote } = getTradeQuoteApi.endpoints
  const { getUsdRates } = getUsdRatesApi.endpoints
  const { getAvailableSwappers } = getSwappersApi.endpoints

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
      swapperDispatch({
        type: SwapperActionType.SET_TRADE_AMOUNTS,
        payload: {
          buyAmountCryptoPrecision: buyTradeAssetAmount,
          sellAmountCryptoPrecision: sellTradeAssetAmount,
          fiatSellAmount,
          fiatBuyAmount,
        },
      })
    },
    [swapperDispatch],
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
      if (sellAsset && buyAsset && action && buyAssetUsdRate && sellAssetUsdRate) {
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
          swapperDispatch({
            type: SwapperActionType.SET_TRADE_AMOUNTS,
            payload: { sellAmountCryptoPrecision: amount },
          })
          break
        case TradeAmountInputField.BUY_FIAT:
        case TradeAmountInputField.BUY_CRYPTO:
          swapperDispatch({
            type: SwapperActionType.SET_TRADE_AMOUNTS,
            payload: { buyAmountCryptoPrecision: amount },
          })
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
      if (!sellAsset || !buyAsset || !wallet) return

      const feeAssetId = getChainAdapterManager().get(sellAsset.chainId)?.getFeeAssetId()
      if (!feeAssetId) return
      const feeAsset = assets[feeAssetId]
      const receiveAddress = await getReceiveAddressFromBuyAsset(buyAsset)
      if (!receiveAddress || !feeAsset) return

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

      const { accountNumber: sellAccountNumber } = sellAccountMetadata.bip44Params
      const tradeQuoteArgs = await getTradeQuoteArgs({
        buyAsset,
        sellAsset,
        sellAccountType: sellAccountMetadata.accountType,
        sellAccountNumber,
        wallet,
        receiveAddress,
        sellAmountBeforeFeesCryptoPrecision:
          sellTradeAsset?.amountCryptoPrecision || amountToUse || '0',
        isSendMax: sendMax ?? isSendMaxFormState,
      })

      const availableSwappers = tradeQuoteArgs
        ? (
            await appDispatch(
              getAvailableSwappers.initiate({
                ...tradeQuoteArgs,
                feeAsset,
              }),
            )
          ).data
        : undefined

      const bestSwapperType = availableSwappers?.[0].swapperType

      const swapperManager = await getSwapperManager(featureFlags)
      const swappers = swapperManager.swappers
      const bestTradeSwapper = bestSwapperType ? swappers.get(bestSwapperType) : undefined

      if (!bestTradeSwapper) {
        swapperDispatch({ type: SwapperActionType.SET_QUOTE, payload: undefined })
        setValue('fees', undefined)
        return
      }

      const quoteResponse = tradeQuoteArgs
        ? await appDispatch(getTradeQuote.initiate(tradeQuoteArgs))
        : undefined

      // If we can't get a quote our trade fee will be 0 - this is likely not desired long-term
      const formFees = quoteResponse?.data
        ? getFormFees({
            trade: quoteResponse.data,
            sellAsset,
            tradeFeeSource: bestTradeSwapper.name,
            feeAsset,
          })
        : undefined

      const { data: usdRates = undefined } = tradeQuoteArgs
        ? await appDispatch(
            getUsdRates.initiate({
              feeAssetId,
              tradeQuoteArgs,
            }),
          )
        : {}

      if (usdRates) {
        swapperDispatch({ type: SwapperActionType.SET_QUOTE, payload: quoteResponse?.data })
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
        swapperDispatch({
          type: SwapperActionType.SET_VALUES,
          payload: {
            sellAssetFiatRate: undefined,
            buyAssetFiatRate: undefined,
            feeAssetFiatRate: undefined,
          },
        })
        setValue('fees', undefined)
      }
    },
    [
      buyAssetFormState?.assetId,
      sellAssetFormState?.assetId,
      amountFormState,
      actionFormState,
      wallet,
      assets,
      getReceiveAddressFromBuyAsset,
      sellTradeAsset,
      isSendMaxFormState,
      appDispatch,
      getAvailableSwappers,
      featureFlags,
      getTradeQuote,
      getUsdRates,
      swapperDispatch,
      setValue,
      setTradeAmounts,
      selectedCurrencyToUsdRate,
    ],
  )

  return {
    setTradeAmountsUsingExistingData,
    setTradeAmountsRefetchData,
  }
}
