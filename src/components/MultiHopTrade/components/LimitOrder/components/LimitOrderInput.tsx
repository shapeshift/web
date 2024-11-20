import { Divider, Stack } from '@chakra-ui/react'
import { skipToken } from '@reduxjs/toolkit/query'
import { fromAccountId } from '@shapeshiftoss/caip'
import { getDefaultSlippageDecimalPercentageForSwapper, SwapperName } from '@shapeshiftoss/swapper'
import { BigNumber, bn, bnOrZero, fromBaseUnit, toBaseUnit } from '@shapeshiftoss/utils'
import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useHistory } from 'react-router'
import type { Address } from 'viem'
import { WarningAcknowledgement } from 'components/Acknowledgement/Acknowledgement'
import { TradeInputTab } from 'components/MultiHopTrade/types'
import { WalletActions } from 'context/WalletProvider/actions'
import { useActions } from 'hooks/useActions'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useQuoteLimitOrderQuery } from 'state/apis/limit-orders/limitOrderApi'
import { selectCalculatedFees, selectIsVotingPowerLoading } from 'state/apis/snapshot/selectors'
import { limitOrderInput } from 'state/slices/limitOrderInputSlice/limitOrderInputSlice'
import {
  selectBuyAccountId,
  selectHasUserEnteredAmount,
  selectInputBuyAsset,
  selectInputSellAmountCryptoPrecision,
  selectInputSellAmountUsd,
  selectInputSellAmountUserCurrency,
  selectInputSellAsset,
  selectIsInputtingFiatSellAmount,
  selectLimitPriceBuyAsset,
  selectSellAccountId,
  selectUserSlippagePercentage,
  selectUserSlippagePercentageDecimal,
} from 'state/slices/limitOrderInputSlice/selectors'
import {
  selectIsAnyAccountMetadataLoadedForChainId,
  selectUserCurrencyToUsdRate,
} from 'state/slices/selectors'
import {
  selectIsTradeQuoteRequestAborted,
  selectShouldShowTradeQuoteOrAwaitInput,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import { SharedSlippagePopover } from '../../SharedTradeInput/SharedSlippagePopover'
import { SharedTradeInput } from '../../SharedTradeInput/SharedTradeInput'
import { SharedTradeInputBody } from '../../SharedTradeInput/SharedTradeInputBody'
import { SharedTradeInputFooter } from '../../SharedTradeInput/SharedTradeInputFooter/SharedTradeInputFooter'
import { useLimitOrderRecipientAddress } from '../hooks/useLimitOrderRecipientAddress'
import { LimitOrderRoutePaths } from '../types'
import { CollapsibleLimitOrderList } from './CollapsibleLimitOrderList'
import { LimitOrderBuyAsset } from './LimitOrderBuyAsset'
import { LimitOrderConfig } from './LimitOrderConfig'

type LimitOrderInputProps = {
  tradeInputRef: React.MutableRefObject<HTMLDivElement | null>
  isCompact?: boolean
  onChangeTab: (newTab: TradeInputTab) => void
}

export const LimitOrderInput = ({
  isCompact,
  tradeInputRef,
  onChangeTab,
}: LimitOrderInputProps) => {
  const {
    dispatch: walletDispatch,
    state: { isConnected, isDemoWallet },
  } = useWallet()

  const history = useHistory()
  const { handleSubmit } = useFormContext()
  const { showErrorToast } = useErrorHandler()

  const userSlippagePercentageDecimal = useAppSelector(selectUserSlippagePercentageDecimal)
  const userSlippagePercentage = useAppSelector(selectUserSlippagePercentage)
  const sellAsset = useAppSelector(selectInputSellAsset)
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const limitPriceBuyAsset = useAppSelector(selectLimitPriceBuyAsset)
  const sellAccountId = useAppSelector(selectSellAccountId)
  const buyAccountId = useAppSelector(selectBuyAccountId)
  const inputSellAmountUserCurrency = useAppSelector(selectInputSellAmountUserCurrency)
  const inputSellAmountUsd = useAppSelector(selectInputSellAmountUsd)
  const isInputtingFiatSellAmount = useAppSelector(selectIsInputtingFiatSellAmount)
  const sellAmountCryptoPrecision = useAppSelector(selectInputSellAmountCryptoPrecision)
  const shouldShowTradeQuoteOrAwaitInput = useAppSelector(selectShouldShowTradeQuoteOrAwaitInput)
  const isTradeQuoteRequestAborted = useAppSelector(selectIsTradeQuoteRequestAborted)
  const hasUserEnteredAmount = useAppSelector(selectHasUserEnteredAmount)
  const isVotingPowerLoading = useAppSelector(selectIsVotingPowerLoading)
  const userCurrencyRate = useAppSelector(selectUserCurrencyToUsdRate)

  const {
    switchAssets,
    setSellAsset,
    setBuyAsset,
    setSellAccountId,
    setBuyAccountId,
    setLimitPriceBuyAsset,
    setSlippagePreferencePercentage,
    setIsInputtingFiatSellAmount,
    setSellAmountCryptoPrecision,
  } = useActions(limitOrderInput.actions)

  const feeParams = useMemo(
    () => ({ feeModel: 'SWAPPER' as const, inputAmountUsd: inputSellAmountUsd }),
    [inputSellAmountUsd],
  )

  const { feeUsd, feeBps } = useAppSelector(state => selectCalculatedFees(state, feeParams))

  const defaultSlippagePercentageDecimal = useMemo(() => {
    return getDefaultSlippageDecimalPercentageForSwapper(SwapperName.CowSwap)
  }, [])
  const defaultSlippagePercentage = useMemo(() => {
    return bn(defaultSlippagePercentageDecimal).times(100).toString()
  }, [defaultSlippagePercentageDecimal])

  const { isRecipientAddressEntryActive, renderedRecipientAddress, recipientAddress } =
    useLimitOrderRecipientAddress({
      buyAsset,
      buyAccountId,
      sellAccountId,
    })

  const [isConfirmationLoading, setIsConfirmationLoading] = useState(false)
  const [shouldShowWarningAcknowledgement, setShouldShowWarningAcknowledgement] = useState(false)

  const isAnyAccountMetadataLoadedForChainIdFilter = useMemo(
    () => ({ chainId: sellAsset.chainId }),
    [sellAsset.chainId],
  )
  const isAnyAccountMetadataLoadedForChainId = useAppSelector(state =>
    selectIsAnyAccountMetadataLoadedForChainId(state, isAnyAccountMetadataLoadedForChainIdFilter),
  )

  const warningAcknowledgementMessage = useMemo(() => {
    // TODO: Implement me
    return ''
  }, [])

  const handleConnect = useCallback(() => {
    walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }, [walletDispatch])

  const onSubmit = useCallback(() => {
    // No preview happening if wallet isn't connected i.e is using the demo wallet
    if (!isConnected || isDemoWallet) {
      return handleConnect()
    }

    setIsConfirmationLoading(true)
    try {
      // TODO: Implement any async logic here
      history.push(LimitOrderRoutePaths.Confirm)
    } catch (e) {
      showErrorToast(e)
    }

    setIsConfirmationLoading(false)
  }, [handleConnect, history, isConnected, isDemoWallet, showErrorToast])

  const handleFormSubmit = useMemo(() => handleSubmit(onSubmit), [handleSubmit, onSubmit])

  const handleWarningAcknowledgementSubmit = useCallback(() => {
    handleFormSubmit()
  }, [handleFormSubmit])

  const handleTradeQuoteConfirm = useCallback(
    (e: FormEvent<unknown>) => {
      e.preventDefault()
      handleFormSubmit()
    },
    [handleFormSubmit],
  )

  const sellAmountCryptoBaseUnit = useMemo(() => {
    return toBaseUnit(sellAmountCryptoPrecision, sellAsset.precision)
  }, [sellAmountCryptoPrecision, sellAsset.precision])

  const sellAccountAddress = useMemo(() => {
    if (!sellAccountId) return

    return fromAccountId(sellAccountId).account as Address
  }, [sellAccountId])

  const limitOrderQuoteParams = useMemo(() => {
    // Return skipToken if any required params are missing
    if (bnOrZero(sellAmountCryptoBaseUnit).isZero()) {
      return skipToken
    }

    return {
      sellAssetId: sellAsset.assetId,
      buyAssetId: buyAsset.assetId,
      chainId: sellAsset.chainId,
      slippageTolerancePercentageDecimal:
        userSlippagePercentageDecimal ?? defaultSlippagePercentageDecimal,
      affiliateBps: feeBps.toFixed(0),
      sellAccountAddress,
      sellAmountCryptoBaseUnit,
      recipientAddress,
    }
  }, [
    sellAmountCryptoBaseUnit,
    sellAsset.assetId,
    sellAsset.chainId,
    buyAsset.assetId,
    userSlippagePercentageDecimal,
    defaultSlippagePercentageDecimal,
    feeBps,
    sellAccountAddress,
    recipientAddress,
  ])

  // This fetches the quote only, not the limit order. The quote is used to determine the market
  // price. When submitting a limit order, the buyAmount is (optionally) modified based on the user
  // input, and then re-attached to the `LimitOrder` before signing and submitting via our
  // `placeLimitOrder` endpoint in limitOrderApi
  const {
    data,
    error,
    isFetching: isLimitOrderQuoteFetching,
  } = useQuoteLimitOrderQuery(limitOrderQuoteParams)

  const marketPriceBuyAsset = useMemo(() => {
    // RTK query returns stale data when `skipToken` is used, so we need to handle that case here.
    if (!data || limitOrderQuoteParams === skipToken) return '0'

    return bnOrZero(fromBaseUnit(data.quote.buyAmount, buyAsset.precision))
      .div(fromBaseUnit(data.quote.sellAmount, sellAsset.precision))
      .toFixed()
  }, [buyAsset.precision, data, sellAsset.precision, limitOrderQuoteParams])

  // Reset the limit price when the market price changes.
  // TODO: If we introduce polling of quotes, we will need to add logic inside `LimitOrderConfig` to
  // not reset the user's config unless the asset pair changes.
  useEffect(() => {
    setLimitPriceBuyAsset(marketPriceBuyAsset)
  }, [setLimitPriceBuyAsset, marketPriceBuyAsset])

  const isLoading = useMemo(() => {
    return (
      isLimitOrderQuoteFetching ||
      // No account meta loaded for that chain
      !isAnyAccountMetadataLoadedForChainId ||
      (!shouldShowTradeQuoteOrAwaitInput && !isTradeQuoteRequestAborted) ||
      isConfirmationLoading ||
      // Only consider snapshot API queries as pending if we don't have voting power yet
      // if we do, it means we have persisted or cached (both stale) data, which is enough to let the user continue
      // as we are optimistic and don't want to be waiting for a potentially very long time for the snapshot API to respond
      isVotingPowerLoading
    )
  }, [
    isAnyAccountMetadataLoadedForChainId,
    isConfirmationLoading,
    isLimitOrderQuoteFetching,
    isTradeQuoteRequestAborted,
    isVotingPowerLoading,
    shouldShowTradeQuoteOrAwaitInput,
  ])

  const headerRightContent = useMemo(() => {
    return (
      <SharedSlippagePopover
        defaultSlippagePercentage={defaultSlippagePercentage}
        quoteSlippagePercentage={undefined} // No slippage returned by CoW
        userSlippagePercentage={userSlippagePercentage}
        setUserSlippagePercentage={setSlippagePreferencePercentage}
      />
    )
  }, [defaultSlippagePercentage, setSlippagePreferencePercentage, userSlippagePercentage])

  const bodyContent = useMemo(() => {
    return (
      <SharedTradeInputBody
        buyAsset={buyAsset}
        isInputtingFiatSellAmount={isInputtingFiatSellAmount}
        isLoading={isLoading}
        sellAmountCryptoPrecision={sellAmountCryptoPrecision}
        sellAmountUserCurrency={inputSellAmountUserCurrency}
        sellAsset={sellAsset}
        sellAccountId={sellAccountId}
        onSwitchAssets={switchAssets}
        onChangeIsInputtingFiatSellAmount={setIsInputtingFiatSellAmount}
        onChangeSellAmountCryptoPrecision={setSellAmountCryptoPrecision}
        setSellAsset={setSellAsset}
        setSellAccountId={setSellAccountId}
      >
        <Stack>
          <LimitOrderBuyAsset
            asset={buyAsset}
            accountId={buyAccountId}
            isInputtingFiatSellAmount={isInputtingFiatSellAmount}
            onAccountIdChange={setBuyAccountId}
            onSetBuyAsset={setBuyAsset}
          />
          <Divider />
          <LimitOrderConfig
            sellAsset={sellAsset}
            buyAsset={buyAsset}
            isLoading={isLoading}
            marketPriceBuyAsset={marketPriceBuyAsset}
            limitPriceBuyAsset={limitPriceBuyAsset}
            setLimitPriceBuyAsset={setLimitPriceBuyAsset}
          />
        </Stack>
      </SharedTradeInputBody>
    )
  }, [
    buyAccountId,
    buyAsset,
    inputSellAmountUserCurrency,
    isInputtingFiatSellAmount,
    isLoading,
    limitPriceBuyAsset,
    marketPriceBuyAsset,
    sellAccountId,
    sellAmountCryptoPrecision,
    sellAsset,
    setBuyAccountId,
    setBuyAsset,
    setIsInputtingFiatSellAmount,
    setLimitPriceBuyAsset,
    setSellAccountId,
    setSellAmountCryptoPrecision,
    setSellAsset,
    switchAssets,
  ])

  const affiliateFeeAfterDiscountUserCurrency = useMemo(() => {
    return bn(feeUsd).times(userCurrencyRate).toFixed(2, BigNumber.ROUND_HALF_UP)
  }, [feeUsd, userCurrencyRate])

  const footerContent = useMemo(() => {
    return (
      <SharedTradeInputFooter
        affiliateBps={feeBps.toFixed(0)}
        affiliateFeeAfterDiscountUserCurrency={affiliateFeeAfterDiscountUserCurrency}
        buyAsset={buyAsset}
        hasUserEnteredAmount={hasUserEnteredAmount}
        inputAmountUsd={inputSellAmountUsd}
        isError={Boolean(error)}
        isLoading={isLoading}
        quoteStatusTranslation={'limitOrder.previewOrder'}
        rate={bnOrZero(limitPriceBuyAsset).isZero() ? undefined : limitPriceBuyAsset}
        sellAccountId={sellAccountId}
        shouldDisableGasRateRowClick
        shouldDisablePreviewButton={isRecipientAddressEntryActive}
        swapperName={SwapperName.CowSwap}
        swapSource={SwapperName.CowSwap}
        networkFeeFiatUserCurrency='0' // CoW protocol is always zero network fee
        sellAsset={sellAsset}
      >
        {renderedRecipientAddress}
      </SharedTradeInputFooter>
    )
  }, [
    feeBps,
    affiliateFeeAfterDiscountUserCurrency,
    buyAsset,
    hasUserEnteredAmount,
    inputSellAmountUsd,
    error,
    isLoading,
    limitPriceBuyAsset,
    sellAccountId,
    isRecipientAddressEntryActive,
    sellAsset,
    renderedRecipientAddress,
  ])

  return (
    <>
      <WarningAcknowledgement
        message={warningAcknowledgementMessage}
        onAcknowledge={handleWarningAcknowledgementSubmit}
        shouldShowAcknowledgement={shouldShowWarningAcknowledgement}
        setShouldShowAcknowledgement={setShouldShowWarningAcknowledgement}
      />
      <SharedTradeInput
        bodyContent={bodyContent}
        footerContent={footerContent}
        shouldOpenSideComponent={true}
        headerRightContent={headerRightContent}
        isCompact={isCompact}
        isLoading={isLoading}
        sideComponent={CollapsibleLimitOrderList}
        tradeInputRef={tradeInputRef}
        tradeInputTab={TradeInputTab.LimitOrder}
        onSubmit={handleTradeQuoteConfirm}
        onChangeTab={onChangeTab}
      />
    </>
  )
}
