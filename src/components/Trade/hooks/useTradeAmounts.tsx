import type { AssetId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { useCallback } from 'react'
import { useSelector } from 'react-redux'
import { useReceiveAddress } from 'components/Trade/hooks/useReceiveAddress'
import type { CalculateAmountsArgs } from 'components/Trade/hooks/useSwapper/calculateAmounts'
import { calculateAmounts } from 'components/Trade/hooks/useSwapper/calculateAmounts'
import { getTradeQuoteArgs } from 'components/Trade/hooks/useSwapper/getTradeQuoteArgs'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import { getFormFees } from 'components/Trade/hooks/useSwapper/utils'
import type { DisplayFeeData } from 'components/Trade/types'
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
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

export const useTradeAmounts = () => {
  // Hooks
  const featureFlags = useAppSelector(selectFeatureFlags)
  const appDispatch = useAppDispatch()
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
  const updateQuote = useSwapperStore(state => state.updateQuote)
  const buyAssetFiatRateFormState = useSwapperStore(state => state.buyAssetFiatRate)
  const sellAssetFiatRateFormState = useSwapperStore(state => state.sellAssetFiatRate)
  const updateBuyAssetFiatRate = useSwapperStore(state => state.updateBuyAssetFiatRate)
  const updateSellAssetFiatRate = useSwapperStore(state => state.updateSellAssetFiatRate)
  const updateFeeAssetFiatRate = useSwapperStore(state => state.updateFeeAssetFiatRate)
  const updateTradeAmounts = useSwapperStore(state => state.updateTradeAmounts)
  const actionFormState = useSwapperStore(state => state.action)
  const isSendMaxFormState = useSwapperStore(state => state.isSendMax)
  const amountFormState = useSwapperStore(state => state.amount)
  const updateFees = useSwapperStore(state => state.updateFees)
  const feesFormState = useSwapperStore(state => state.fees)
  const sellAssetFormState = useSwapperStore(state => state.sellAsset)
  const buyAssetFormState = useSwapperStore(state => state.buyAsset)
  const sellAmountCryptoPrecisionFormState = useSwapperStore(
    state => state.sellAmountCryptoPrecision,
  )

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
      updateTradeAmounts({
        buyAmountCryptoPrecision: buyTradeAssetAmount,
        sellAmountCryptoPrecision: sellTradeAssetAmount,
        fiatSellAmount,
        fiatBuyAmount,
      })
    },
    [updateTradeAmounts],
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
          updateTradeAmounts({
            sellAmountCryptoPrecision: amount,
          })
          break
        case TradeAmountInputField.BUY_FIAT:
        case TradeAmountInputField.BUY_CRYPTO:
          updateTradeAmounts({
            buyAmountCryptoPrecision: amount,
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
          sellAmountCryptoPrecisionFormState || amountToUse || '0',
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
        updateQuote(undefined)
        updateFees(undefined)
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
        updateQuote(quoteResponse?.data)
        updateFees(formFees)
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
        updateBuyAssetFiatRate(undefined)
        updateSellAssetFiatRate(undefined)
        updateFeeAssetFiatRate(undefined)
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
      sellAmountCryptoPrecisionFormState,
      isSendMaxFormState,
      appDispatch,
      getAvailableSwappers,
      featureFlags,
      getTradeQuote,
      getUsdRates,
      updateTradeAmounts,
      updateQuote,
      updateFees,
      setTradeAmounts,
      selectedCurrencyToUsdRate,
      updateBuyAssetFiatRate,
      updateSellAssetFiatRate,
      updateFeeAssetFiatRate,
    ],
  )

  return {
    setTradeAmountsUsingExistingData,
    setTradeAmountsRefetchData,
  }
}
