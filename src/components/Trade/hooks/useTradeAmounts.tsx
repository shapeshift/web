import type { AssetId } from '@shapeshiftoss/caip'
import { useCallback, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useReceiveAddress } from 'components/Trade/hooks/useReceiveAddress'
import type { CalculateAmountsArgs } from 'components/Trade/hooks/useSwapper/calculateAmounts'
import { calculateAmounts } from 'components/Trade/hooks/useSwapper/calculateAmounts'
import { getTradeQuoteArgs } from 'components/Trade/hooks/useSwapper/getTradeQuoteArgs'
import { getFormFees } from 'components/Trade/hooks/useSwapper/utils'
import { TradeAmountInputField } from 'components/Trade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { isSome } from 'lib/utils'
import { getSwappersApi } from 'state/apis/swapper/getSwappersApi'
import { getUsdRatesApi } from 'state/apis/swapper/getUsdRatesApi'
import {
  selectAssets,
  selectFiatToUsdRate,
  selectPortfolioAccountIdsByAssetId,
  selectPortfolioAccountMetadataByAccountId,
} from 'state/slices/selectors'
import { store, useAppDispatch, useAppSelector } from 'state/store'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

export const useTradeAmounts = () => {
  // Hooks
  const appDispatch = useAppDispatch()
  const { getReceiveAddressFromBuyAsset } = useReceiveAddress()
  const wallet = useWallet().state.wallet

  // Types
  type SetTradeAmountsAsynchronousArgs = {
    amount: string
    action: TradeAmountInputField
  }

  type SetTradeAmountsSynchronousArgs = {
    sellAssetId?: AssetId
    buyAssetId?: AssetId
    amount: string
    action: TradeAmountInputField
    sendMax?: boolean
  }
  type SetTradeAmountsArgs = CalculateAmountsArgs

  // Selectors
  const selectedCurrencyToUsdRate = useAppSelector(selectFiatToUsdRate)
  const assets = useSelector(selectAssets)
  const buyAssetFiatRate = useSwapperStore(state => state.buyAssetFiatRate)
  const sellAssetFiatRate = useSwapperStore(state => state.sellAssetFiatRate)
  const updateBuyAssetFiatRate = useSwapperStore(state => state.updateBuyAssetFiatRate)
  const updateSellAssetFiatRate = useSwapperStore(state => state.updateSellAssetFiatRate)
  const updateFeeAssetFiatRate = useSwapperStore(state => state.updateFeeAssetFiatRate)
  const updateTradeAmounts = useSwapperStore(state => state.updateTradeAmounts)
  const isSendMaxSwapperState = useSwapperStore(state => state.isSendMax)
  const updateFees = useSwapperStore(state => state.updateFees)
  const fees = useSwapperStore(state => state.fees)
  const sellAssetSwapperState = useSwapperStore(state => state.sellAsset)
  const buyAssetSwapperState = useSwapperStore(state => state.buyAsset)
  const sellAmountCryptoPrecisionSwapperState = useSwapperStore(
    state => state.sellAmountCryptoPrecision,
  )
  const amountSwapperState = useSwapperStore(state => state.amount)
  const actionSwapperState = useSwapperStore(state => state.action)
  const activeTradeSwapper = useSwapperStore(state => state.activeSwapperWithMetadata?.swapper)
  const activeSwapperType = activeTradeSwapper?.getType()

  const { getAvailableSwappers } = getSwappersApi.endpoints
  const { getUsdRates } = getUsdRatesApi.endpoints

  const setTradeAmounts = useCallback(
    (args: SetTradeAmountsArgs) => {
      const {
        sellAmountSellAssetBaseUnit,
        buyAmountBuyAssetBaseUnit,
        fiatSellAmount,
        fiatBuyAmount,
      } = calculateAmounts(args)
      const buyAmountCryptoPrecision = fromBaseUnit(
        buyAmountBuyAssetBaseUnit,
        args.buyAsset.precision,
      )
      const sellAmountCryptoPrecision = fromBaseUnit(
        sellAmountSellAssetBaseUnit,
        args.sellAsset.precision,
      )
      updateTradeAmounts({
        buyAmountCryptoPrecision,
        sellAmountCryptoPrecision,
        fiatSellAmount,
        fiatBuyAmount,
      })
    },
    [updateTradeAmounts],
  )

  // Use the existing fiat rates and quote without waiting for fresh data
  const setTradeAmountsUsingExistingData = useCallback(
    ({ amount, action }: SetTradeAmountsAsynchronousArgs) => {
      const buyAssetTradeFeeFiat = bnOrZero(fees?.buyAssetTradeFeeUsd).times(
        selectedCurrencyToUsdRate,
      )
      const sellAssetTradeFeeFiat = bnOrZero(fees?.sellAssetTradeFeeUsd).times(
        selectedCurrencyToUsdRate,
      )
      if (
        sellAssetSwapperState &&
        buyAssetSwapperState &&
        action &&
        buyAssetFiatRate &&
        sellAssetFiatRate
      ) {
        setTradeAmounts({
          amount,
          action,
          buyAsset: buyAssetSwapperState,
          sellAsset: sellAssetSwapperState,
          buyAssetFiatRate,
          sellAssetFiatRate,
          buyAssetTradeFeeFiat,
          sellAssetTradeFeeFiat,
        })
      }
    },
    [
      fees?.buyAssetTradeFeeUsd,
      fees?.sellAssetTradeFeeUsd,
      selectedCurrencyToUsdRate,
      sellAssetSwapperState,
      buyAssetSwapperState,
      buyAssetFiatRate,
      sellAssetFiatRate,
      setTradeAmounts,
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

      const buyAssetIdToUse = buyAssetId ?? buyAssetSwapperState?.assetId
      const sellAssetIdToUse = sellAssetId ?? sellAssetSwapperState?.assetId
      if (!buyAssetIdToUse || !sellAssetIdToUse || !wallet) return
      const sellAssetToUse = assets[sellAssetIdToUse]
      const buyAssetToUse = assets[buyAssetIdToUse]
      if (!sellAssetToUse || !buyAssetToUse || !wallet) return

      const feeAssetId = getChainAdapterManager().get(sellAssetToUse.chainId)?.getFeeAssetId()
      if (!feeAssetId) return
      const feeAsset = assets[feeAssetId]
      const receiveAddress = await getReceiveAddressFromBuyAsset(buyAssetToUse)
      if (!receiveAddress || !feeAsset) return

      const state = store.getState()
      const sellAssetAccountIds = selectPortfolioAccountIdsByAssetId(state, {
        assetId: sellAssetToUse.assetId,
      })
      const sellAccountFilter = { accountId: sellAssetAccountIds[0] }
      const sellAccountMetadata = selectPortfolioAccountMetadataByAccountId(
        state,
        sellAccountFilter,
      )

      if (!sellAccountMetadata) return // no-op, need at least bip44Params to get tradeQuoteArgs

      const { accountNumber: sellAccountNumber } = sellAccountMetadata.bip44Params
      const tradeQuoteArgs = await getTradeQuoteArgs({
        buyAsset: buyAssetToUse,
        sellAsset: sellAssetToUse,
        sellAccountType: sellAccountMetadata.accountType,
        sellAccountNumber,
        wallet,
        receiveAddress,
        sellAmountBeforeFeesCryptoPrecision: sellAmountCryptoPrecisionSwapperState || amount || '0',
        isSendMax: sendMax ?? isSendMaxSwapperState,
      })

      if (!activeTradeSwapper || !activeSwapperType) {
        updateFees(undefined)
        return
      }

      const availableSwapperTypesWithQuoteMetadata =
        tradeQuoteArgs && feeAsset
          ? (
              await appDispatch(
                getAvailableSwappers.initiate({
                  ...tradeQuoteArgs,
                  feeAsset,
                }),
              )
            ).data
          : undefined

      const bestTradeQuote = availableSwapperTypesWithQuoteMetadata
        ?.map(s => s.quote)
        .filter(isSome)[0]

      // If we can't get a quote our trade fee will be 0 - this is likely not desired long-term
      const formFees = bestTradeQuote
        ? getFormFees({
            trade: bestTradeQuote,
            sellAsset: sellAssetToUse,
            tradeFeeSource: activeTradeSwapper.name,
            feeAsset,
          })
        : undefined

      const { data: usdRates = undefined } =
        tradeQuoteArgs && activeSwapperType
          ? await appDispatch(
              getUsdRates.initiate({
                feeAssetId,
                tradeQuoteArgs,
                swapperType: activeSwapperType,
              }),
            )
          : {}

      if (usdRates) {
        const buyAssetTradeFeeFiat = bnOrZero(formFees?.buyAssetTradeFeeUsd).times(
          selectedCurrencyToUsdRate,
        )
        const sellAssetTradeFeeFiat = bnOrZero(formFees?.sellAssetTradeFeeUsd).times(
          selectedCurrencyToUsdRate,
        )
        const buyAssetFiatRate = bnOrZero(usdRates.buyAssetUsdRate)
          .times(selectedCurrencyToUsdRate)
          .toString()
        const sellAssetFiatRate = bnOrZero(usdRates.sellAssetUsdRate)
          .times(selectedCurrencyToUsdRate)
          .toString()
        updateFees(formFees)
        setTradeAmounts({
          amount,
          action,
          buyAsset: buyAssetToUse,
          sellAsset: sellAssetToUse,
          buyAssetFiatRate,
          sellAssetFiatRate,
          buyAssetTradeFeeFiat,
          sellAssetTradeFeeFiat,
        })
      } else {
        updateBuyAssetFiatRate(undefined)
        updateSellAssetFiatRate(undefined)
        updateFeeAssetFiatRate(undefined)
      }
    },
    [
      buyAssetSwapperState?.assetId,
      sellAssetSwapperState?.assetId,
      wallet,
      assets,
      getReceiveAddressFromBuyAsset,
      sellAmountCryptoPrecisionSwapperState,
      isSendMaxSwapperState,
      activeTradeSwapper,
      activeSwapperType,
      appDispatch,
      getAvailableSwappers,
      getUsdRates,
      updateTradeAmounts,
      updateFees,
      selectedCurrencyToUsdRate,
      setTradeAmounts,
      updateBuyAssetFiatRate,
      updateSellAssetFiatRate,
      updateFeeAssetFiatRate,
    ],
  )

  useEffect(() => {
    if (!buyAssetSwapperState || !sellAssetSwapperState || !buyAssetFiatRate || !sellAssetFiatRate)
      return
    const buyAssetTradeFeeFiat = bnOrZero(fees?.buyAssetTradeFeeUsd).times(
      selectedCurrencyToUsdRate,
    )
    const sellAssetTradeFeeFiat = bnOrZero(fees?.sellAssetTradeFeeUsd).times(
      selectedCurrencyToUsdRate,
    )
    const args: CalculateAmountsArgs = {
      amount: amountSwapperState,
      buyAsset: buyAssetSwapperState,
      sellAsset: sellAssetSwapperState,
      buyAssetFiatRate,
      sellAssetFiatRate,
      action: actionSwapperState,
      buyAssetTradeFeeFiat,
      sellAssetTradeFeeFiat,
    }
    setTradeAmounts(args)
  }, [
    actionSwapperState,
    amountSwapperState,
    buyAssetFiatRate,
    buyAssetSwapperState,
    fees?.buyAssetTradeFeeUsd,
    fees?.sellAssetTradeFeeUsd,
    selectedCurrencyToUsdRate,
    sellAssetFiatRate,
    sellAssetSwapperState,
    setTradeAmounts,
  ])

  return {
    setTradeAmountsUsingExistingData,
    setTradeAmountsRefetchData,
  }
}
