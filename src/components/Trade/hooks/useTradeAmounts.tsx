import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
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
  type SetTradeAmountsAsynchronousArgs = Omit<Partial<CalculateAmountsArgs>, 'tradeFee'> & {
    fees?: DisplayFeeData<KnownChainIds>
  }

  type ValidateAmountsArgs = {
    buyTradeAssetAmount: string
    sellTradeAssetAmount: string
  }

  type SetTradeAmountsSynchronousArgs = {
    sellAssetId?: AssetId
    buyAssetId?: AssetId
    amount?: string
    action?: TradeAmountInputField
  }
  type SetTradeAmountsArgs = CalculateAmountsArgs

  // Selectors
  const selectedCurrencyToUsdRate = useAppSelector(selectFiatToUsdRate)

  // Constants
  const sellAssetFormState = sellTradeAsset?.asset
  const buyAssetFormState = buyTradeAsset?.asset

  const validateAmounts = useCallback(
    ({ buyTradeAssetAmount, sellTradeAssetAmount }: ValidateAmountsArgs) => {
      const sellAmountsDoesNotCoverFees =
        bnOrZero(buyTradeAssetAmount).isLessThanOrEqualTo(0) &&
        bnOrZero(sellTradeAssetAmount).isGreaterThan(0)
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

  const setTradeAmounts = useCallback(
    (args: SetTradeAmountsArgs) => {
      const { cryptoSellAmount, cryptoBuyAmount, fiatSellAmount, fiatBuyAmount } =
        calculateAmounts(args)
      const buyTradeAssetAmount = fromBaseUnit(cryptoBuyAmount, args.buyAsset.precision)
      const sellTradeAssetAmount = fromBaseUnit(cryptoSellAmount, args.sellAsset.precision)
      validateAmounts({ buyTradeAssetAmount, sellTradeAssetAmount })
      setValue('fiatSellAmount', fiatSellAmount)
      setValue('fiatBuyAmount', fiatBuyAmount)
      setValue('buyTradeAsset.amount', buyTradeAssetAmount)
      setValue('sellTradeAsset.amount', sellTradeAssetAmount)
    },
    [setValue, validateAmounts],
  )

  // Use the existing fiat rates and quote without waiting for fresh data
  const setTradeAmountsAsynchronous = useCallback(
    (args: SetTradeAmountsAsynchronousArgs) => {
      const amount = args.amount ?? amountFormState
      const action = args.action ?? actionFormState
      const buyAsset = args.buyAsset ?? buyAssetFormState
      const sellAsset = args.sellAsset ?? sellAssetFormState
      const buyAssetUsdRate = args.buyAssetUsdRate ?? buyAssetFiatRateFormState
      const sellAssetUsdRate = args.sellAssetUsdRate ?? sellAssetFiatRateFormState
      const fees = args.fees ?? feesFormState
      const tradeFee = bnOrZero(fees?.tradeFee).div(bnOrZero(buyAssetUsdRate))
      if (sellAsset && buyAsset && amount && action) {
        setTradeAmounts({
          amount,
          action,
          buyAsset,
          sellAsset,
          buyAssetUsdRate,
          sellAssetUsdRate,
          selectedCurrencyToUsdRate,
          tradeFee,
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

  const getFirstAccountIdFromChainId = useCallback(
    (chainId: ChainId) => {
      const accountSpecifiers = accountSpecifiersList.find(specifiers => specifiers[chainId])
      return accountSpecifiers?.[chainId]
    },
    [accountSpecifiersList],
  )

  // Use the args provided to get new fiat rates and a fresh quote
  // Useful when changing assets where we expect response data to meaningfully change - so wait before updating amounts
  const setTradeAmountsSynchronous = useCallback(
    async ({ sellAssetId, buyAssetId, amount, action }: SetTradeAmountsSynchronousArgs) => {
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

      const tradeQuoteArgs = await getTradeQuoteArgs({
        buyAsset,
        sellAsset,
        sellAssetAccountId,
        wallet,
        receiveAddress,
        sellAmount: sellTradeAsset?.amount || amountToUse || '0',
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

      usdRates &&
        setTradeAmounts({
          amount: amountToUse,
          action: actionToUse,
          buyAsset,
          sellAsset,
          buyAssetUsdRate: usdRates.buyAssetUsdRate,
          sellAssetUsdRate: usdRates.sellAssetUsdRate,
          selectedCurrencyToUsdRate,
          tradeFee: bnOrZero(formFees?.tradeFee).div(bnOrZero(usdRates.buyAssetUsdRate)),
        })
    },
    [
      actionFormState,
      amountFormState,
      assets,
      buyAssetFormState?.assetId,
      dispatch,
      getFirstAccountIdFromChainId,
      getReceiveAddressFromBuyAsset,
      getTradeQuote,
      getUsdRates,
      selectedCurrencyToUsdRate,
      sellAssetFormState?.assetId,
      sellTradeAsset?.amount,
      setTradeAmounts,
      setValue,
      swapperManager,
      wallet,
    ],
  )

  return { setTradeAmountsAsynchronous, setTradeAmountsSynchronous }
}
