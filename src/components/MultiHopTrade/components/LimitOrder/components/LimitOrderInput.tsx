import { Button, Divider, Stack, useMediaQuery } from '@chakra-ui/react'
import { skipToken } from '@reduxjs/toolkit/query'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import {
  COW_SWAP_VAULT_RELAYER_ADDRESS,
  getCowNetwork,
  isNativeEvmAsset,
  SwapperName,
} from '@shapeshiftoss/swapper'
import type { CowSwapError } from '@shapeshiftoss/types'
import { BigNumber, bn, bnOrZero, fromBaseUnit } from '@shapeshiftoss/utils'
import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import type { Address } from 'viem'

import { SharedTradeInput } from '../../SharedTradeInput/SharedTradeInput'
import { SharedTradeInputBody } from '../../SharedTradeInput/SharedTradeInputBody'
import { SharedTradeInputFooter } from '../../SharedTradeInput/SharedTradeInputFooter/SharedTradeInputFooter'
import { getCowSwapErrorTranslation, isCowSwapError } from '../helpers'
import { useLimitOrderRecipientAddress } from '../hooks/useLimitOrderRecipientAddress'
import { LimitOrderRoutePaths } from '../types'
import { CollapsibleLimitOrderList } from './CollapsibleLimitOrderList'
import { LimitOrderBuyAsset } from './LimitOrderBuyAsset'
import { LimitOrderConfig } from './LimitOrderConfig'
import { LimitOrderFooter } from './LimitOrderFooter'

import { WarningAcknowledgement } from '@/components/Acknowledgement/WarningAcknowledgement'
import { TradeInputTab } from '@/components/MultiHopTrade/types'
import { Text } from '@/components/Text'
import { useDiscoverAccounts } from '@/context/AppProvider/hooks/useDiscoverAccounts'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useActions } from '@/hooks/useActions'
import { useErrorToast } from '@/hooks/useErrorToast/useErrorToast'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { DEFAULT_FEE_BPS } from '@/lib/fees/constant'
import { calculateFeeUsd } from '@/lib/fees/utils'
import { getErc20Allowance } from '@/lib/utils/evm'
import { useQuoteLimitOrderQuery } from '@/state/apis/limit-orders/limitOrderApi'
import { LimitPriceMode, PriceDirection } from '@/state/slices/limitOrderInputSlice/constants'
import { expiryOptionToUnixTimestamp } from '@/state/slices/limitOrderInputSlice/helpers'
import { limitOrderInput } from '@/state/slices/limitOrderInputSlice/limitOrderInputSlice'
import {
  selectBuyAccountId,
  selectBuyAmountCryptoBaseUnit,
  selectExpiry,
  selectHasUserEnteredAmount,
  selectInputBuyAsset,
  selectInputSellAmountCryptoBaseUnit,
  selectInputSellAmountCryptoPrecision,
  selectInputSellAmountUsd,
  selectInputSellAmountUserCurrency,
  selectInputSellAsset,
  selectIsInputtingFiatSellAmount,
  selectLimitPrice,
  selectLimitPriceDirection,
  selectLimitPriceMode,
  selectSelectedBuyAssetChainId,
  selectSelectedSellAssetChainId,
  selectSellAccountId,
  selectSellAssetBalanceCryptoBaseUnit,
} from '@/state/slices/limitOrderInputSlice/selectors'
import { makeLimitInputOutputRatio } from '@/state/slices/limitOrderSlice/helpers'
import { limitOrderSlice } from '@/state/slices/limitOrderSlice/limitOrderSlice'
import { selectActiveQuoteNetworkFeeUserCurrency } from '@/state/slices/limitOrderSlice/selectors'
import { useFindMarketDataByAssetIdQuery } from '@/state/slices/marketDataSlice/marketDataSlice'
import { selectUsdRateByAssetId, selectUserCurrencyToUsdRate } from '@/state/slices/selectors'
import {
  selectIsTradeQuoteRequestAborted,
  selectShouldShowTradeQuoteOrAwaitInput,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from '@/state/store'
import { breakpoints } from '@/theme/theme'

type LimitOrderInputProps = {
  tradeInputRef: React.MutableRefObject<HTMLDivElement | null>
  isCompact?: boolean
  onChangeTab: (newTab: TradeInputTab) => void
  noExpand?: boolean
}

const MARKET_DATA_POLLING_INTERVAL = 10_000

export const LimitOrderInput = ({
  isCompact,
  tradeInputRef,
  onChangeTab,
  noExpand,
}: LimitOrderInputProps) => {
  const {
    dispatch: walletDispatch,
    state: { isConnected },
  } = useWallet()

  const navigate = useNavigate()
  const { handleSubmit } = useFormContext()
  const { showErrorToast } = useErrorToast()
  const [isSmallerThanXl] = useMediaQuery(`(max-width: ${breakpoints.xl})`, { ssr: false })

  const sellAsset = useAppSelector(selectInputSellAsset)
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const limitPrice = useAppSelector(selectLimitPrice)
  const sellAccountId = useAppSelector(selectSellAccountId)
  const buyAccountId = useAppSelector(selectBuyAccountId)
  const inputSellAmountUserCurrency = useAppSelector(selectInputSellAmountUserCurrency)
  const inputSellAmountUsd = useAppSelector(selectInputSellAmountUsd)
  const isInputtingFiatSellAmount = useAppSelector(selectIsInputtingFiatSellAmount)
  const sellAmountCryptoPrecision = useAppSelector(selectInputSellAmountCryptoPrecision)
  const sellAmountCryptoBaseUnit = useAppSelector(selectInputSellAmountCryptoBaseUnit)
  const buyAmountCryptoBaseUnit = useAppSelector(selectBuyAmountCryptoBaseUnit)
  const shouldShowTradeQuoteOrAwaitInput = useAppSelector(selectShouldShowTradeQuoteOrAwaitInput)
  const isTradeQuoteRequestAborted = useAppSelector(selectIsTradeQuoteRequestAborted)
  const hasUserEnteredAmount = useAppSelector(selectHasUserEnteredAmount)
  const userCurrencyRate = useAppSelector(selectUserCurrencyToUsdRate)
  const networkFeeUserCurrency = useAppSelector(selectActiveQuoteNetworkFeeUserCurrency)
  const expiry = useAppSelector(selectExpiry)
  const sellAssetBalanceCryptoBaseUnit = useAppSelector(selectSellAssetBalanceCryptoBaseUnit)
  const limitPriceMode = useAppSelector(selectLimitPriceMode)
  const sellAssetUsdRate = useAppSelector(state => selectUsdRateByAssetId(state, sellAsset.assetId))
  const buyAssetUsdRate = useAppSelector(state => selectUsdRateByAssetId(state, buyAsset.assetId))
  const selectedSellAssetChainId = useAppSelector(selectSelectedSellAssetChainId)
  const selectedBuyAssetChainId = useAppSelector(selectSelectedBuyAssetChainId)

  const {
    switchAssets,
    setSellAsset,
    setBuyAsset,
    setSellAccountId,
    setBuyAccountId,
    setLimitPrice,
    setIsInputtingFiatSellAmount,
    setSellAmountCryptoPrecision,
    setSelectedSellAssetChainId,
    setSelectedBuyAssetChainId,
  } = useActions(limitOrderInput.actions)
  const { setActiveQuote, setLimitOrderInitialized } = useActions(limitOrderSlice.actions)
  const { isFetching: isDiscoveringAccounts } = useDiscoverAccounts()
  const isNewLimitFlowEnabled = useFeatureFlag('NewLimitFlow')

  const priceDirection = useAppSelector(selectLimitPriceDirection)

  const feeUsd = calculateFeeUsd({ inputAmountUsd: bnOrZero(inputSellAmountUsd) })

  const { isRecipientAddressEntryActive, renderedRecipientAddress, recipientAddress } =
    useLimitOrderRecipientAddress({
      buyAsset,
      buyAccountId,
      sellAccountId,
    })

  const [shouldShowWarningAcknowledgement, setShouldShowWarningAcknowledgement] = useState(false)
  const [isCheckingAllowance, setIsCheckingAllowance] = useState(false)

  const warningAcknowledgementMessage = useMemo(() => {
    // TODO: Implement me
    return ''
  }, [])

  const handleConnect = useCallback(() => {
    walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }, [walletDispatch])

  const chainIdFilterPredicate = useCallback((chainId: ChainId) => {
    return getCowNetwork(chainId) !== undefined
  }, [])

  const sellAssetFilterPredicate = useCallback(
    (assetId: AssetId) => {
      const { chainId } = fromAssetId(assetId)
      return chainIdFilterPredicate(chainId) && !isNativeEvmAsset(assetId)
    },
    [chainIdFilterPredicate],
  )

  const buyAssetFilterPredicate = useCallback(
    (assetId: AssetId) => {
      const { chainId } = fromAssetId(assetId)
      return chainIdFilterPredicate(chainId)
    },
    [chainIdFilterPredicate],
  )

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
      affiliateBps: DEFAULT_FEE_BPS,
      sellAccountAddress,
      sellAmountCryptoBaseUnit,
      recipientAddress,
    }
  }, [
    sellAmountCryptoBaseUnit,
    sellAsset.assetId,
    sellAsset.chainId,
    buyAsset.assetId,
    sellAccountAddress,
    recipientAddress,
  ])

  // This fetches the quote only, not the limit order. The quote is used to determine the market
  // price. When submitting a limit order, the buyAmount is (optionally) modified based on the user
  // input, and then re-attached to the `LimitOrder` before signing and submitting via our
  // `placeLimitOrder` endpoint in limitOrderApi
  const {
    data: quoteResponse,
    error: quoteResponseError,
    isFetching: isLimitOrderQuoteFetching,
  } = useQuoteLimitOrderQuery(limitOrderQuoteParams)

  useFindMarketDataByAssetIdQuery(sellAsset.assetId, {
    pollingInterval: MARKET_DATA_POLLING_INTERVAL,
  })

  useFindMarketDataByAssetIdQuery(buyAsset.assetId, {
    pollingInterval: MARKET_DATA_POLLING_INTERVAL,
  })

  const sellAssetMarketDataUsd = useAppSelector(state =>
    selectUsdRateByAssetId(state, sellAsset.assetId),
  )
  const buyAssetMarketDataUsd = useAppSelector(state =>
    selectUsdRateByAssetId(state, buyAsset.assetId),
  )

  const marketPriceBuyAsset = useMemo(() => {
    if (!(sellAssetMarketDataUsd && buyAssetMarketDataUsd)) return '0'

    return makeLimitInputOutputRatio({
      sellPriceUsd: sellAssetMarketDataUsd,
      buyPriceUsd: buyAssetMarketDataUsd,
      targetAssetPrecision: buyAsset.precision,
    })
  }, [sellAssetMarketDataUsd, buyAssetMarketDataUsd, buyAsset])

  // Update the limit price when the market price changes.
  useEffect(() => {
    // Don't update if the user has a custom value configured.
    if (limitPriceMode !== LimitPriceMode.CustomValue) {
      setLimitPrice({ marketPriceBuyAsset })
    }
  }, [limitPriceMode, marketPriceBuyAsset, setLimitPrice])

  const onSubmit = useCallback(async () => {
    // No preview happening if wallet isn't connected
    if (!isConnected) {
      return handleConnect()
    }

    // RTK query returns stale data when `skipToken` is used, so we need to handle that case here.
    // This should never happen because we're meant to disable the confirmation button when this is
    // true, but just in case.
    if (!quoteResponse || limitOrderQuoteParams === skipToken || !sellAccountId) {
      setActiveQuote(undefined)
      return
    }

    // Everything gets bundled up into a canonical set of data for execution. This is to avoid
    // dramas with race conditions, polling, etc. across the input and execution stages of the limit
    // orders feature.
    setActiveQuote({
      params: {
        ...limitOrderQuoteParams,
        validTo: expiryOptionToUnixTimestamp(expiry),
        buyAmountCryptoBaseUnit,
        accountId: sellAccountId,
      },
      response: quoteResponse,
    })

    const { assetReference, chainId } = fromAssetId(limitOrderQuoteParams.sellAssetId)

    if (isNewLimitFlowEnabled) {
      if (!quoteResponse.id) {
        console.error('Missing quoteId')
        return
      }

      setLimitOrderInitialized(quoteResponse.id)
      navigate(LimitOrderRoutePaths.Confirm)

      // If the new limit flow is enabled, we don't need to check the allowance here, so we
      // update the slice state immediately and return
      return
    } else {
      // Trigger loading state while we check the allowance
      setIsCheckingAllowance(true)

      try {
        // Check the ERC20 token allowance
        const allowanceOnChainCryptoBaseUnit = await getErc20Allowance({
          address: assetReference,
          spender: COW_SWAP_VAULT_RELAYER_ADDRESS,
          from: limitOrderQuoteParams.sellAccountAddress as Address,
          chainId,
        })

        // If approval is required, route there
        if (bn(allowanceOnChainCryptoBaseUnit).lt(limitOrderQuoteParams.sellAmountCryptoBaseUnit)) {
          navigate(LimitOrderRoutePaths.AllowanceApproval)
          return
        }

        // Otherwise, proceed with confirmation
        navigate(LimitOrderRoutePaths.Confirm)
        return
      } catch (e) {
        showErrorToast(e)
      } finally {
        setIsCheckingAllowance(false)
      }
    }
  }, [
    isConnected,
    quoteResponse,
    limitOrderQuoteParams,
    sellAccountId,
    setActiveQuote,
    expiry,
    buyAmountCryptoBaseUnit,
    isNewLimitFlowEnabled,
    handleConnect,
    setLimitOrderInitialized,
    navigate,
    showErrorToast,
  ])

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

  const handleShowLimitOrdersList = useCallback(() => {
    navigate(LimitOrderRoutePaths.Orders)
  }, [navigate])

  const handleSwitchAssets = useCallback(() => {
    switchAssets({ sellAssetUsdRate, buyAssetUsdRate })
  }, [buyAssetUsdRate, sellAssetUsdRate, switchAssets])

  const isLoading = useMemo(() => {
    return isCheckingAllowance || (!shouldShowTradeQuoteOrAwaitInput && !isTradeQuoteRequestAborted)
  }, [isCheckingAllowance, isTradeQuoteRequestAborted, shouldShowTradeQuoteOrAwaitInput])

  const headerRightContent = useMemo(() => {
    if (!(isCompact || isSmallerThanXl)) return <></>
    return (
      <Button size='xs' borderRadius='full' onClick={handleShowLimitOrdersList}>
        <Text translation='limitOrder.viewOrders' />
      </Button>
    )
  }, [isCompact, isSmallerThanXl, handleShowLimitOrdersList])

  const { quoteStatusTranslation, isError } = useMemo(() => {
    switch (true) {
      case isDiscoveringAccounts && !(sellAccountId || buyAccountId):
        return { quoteStatusTranslation: 'common.accountsLoading', isError: false }
      case !shouldShowTradeQuoteOrAwaitInput:
      case !hasUserEnteredAmount:
        return { quoteStatusTranslation: 'trade.previewTrade', isError: false }
      case bnOrZero(sellAssetBalanceCryptoBaseUnit).isZero():
        return { quoteStatusTranslation: 'limitOrder.errors.zeroFunds', isError: true }
      case sellAsset.chainId !== buyAsset.chainId:
        return { quoteStatusTranslation: 'trade.errors.quoteCrossChainNotSupported', isError: true }
      case isNativeEvmAsset(sellAsset.assetId):
        return {
          quoteStatusTranslation: 'limitOrder.errors.nativeSellAssetNotSupported',
          isError: true,
        }
      case !recipientAddress:
        return { quoteStatusTranslation: 'trade.errors.noReceiveAddress', isError: true }
      case isCowSwapError(quoteResponseError):
        return {
          quoteStatusTranslation: getCowSwapErrorTranslation(quoteResponseError as CowSwapError),
          isError: true,
        }
      case quoteResponseError !== undefined:
        // Catch-all of non-cowswap quote errors
        return { quoteStatusTranslation: 'trade.errors.quoteError', isError: true }
      case !isConnected:
        // We got a happy path quote, but we're not connected
        return { quoteStatusTranslation: 'common.connectWallet', isError: false }
      default:
        return { quoteStatusTranslation: 'trade.previewTrade', isError: false }
    }
  }, [
    buyAccountId,
    buyAsset.chainId,
    hasUserEnteredAmount,
    isDiscoveringAccounts,
    isConnected,
    quoteResponseError,
    recipientAddress,
    sellAccountId,
    sellAsset.assetId,
    sellAsset.chainId,
    sellAssetBalanceCryptoBaseUnit,
    shouldShowTradeQuoteOrAwaitInput,
  ])

  const networkFeesImpactDecimalPercentage = useMemo(() => {
    if (isError) return
    if (isLoading || isLimitOrderQuoteFetching) return
    if (!quoteResponse?.quote) return

    const { feeAmount } = quoteResponse.quote

    const feeAmountCryptoPrecision = fromBaseUnit(feeAmount, sellAsset.precision)

    return bn(feeAmountCryptoPrecision).div(sellAmountCryptoPrecision).toFixed(2)
  }, [
    quoteResponse,
    sellAsset.precision,
    isLoading,
    isLimitOrderQuoteFetching,
    isError,
    sellAmountCryptoPrecision,
  ])

  const networkFeesImpactCryptoPrecision = useMemo(() => {
    if (isError) return
    if (isLoading || isLimitOrderQuoteFetching) return
    if (!networkFeesImpactDecimalPercentage) return

    return bnOrZero(sellAmountCryptoPrecision)
      .times(networkFeesImpactDecimalPercentage)
      .decimalPlaces(sellAsset.precision)
      .toString()
  }, [
    networkFeesImpactDecimalPercentage,
    sellAmountCryptoPrecision,
    isLoading,
    sellAsset.precision,
    isError,
    isLimitOrderQuoteFetching,
  ])

  const bodyContent = useMemo(() => {
    return (
      <SharedTradeInputBody
        buyAsset={buyAsset}
        isInputtingFiatSellAmount={isInputtingFiatSellAmount}
        isLoading={isLoading}
        sellAmountCryptoPrecision={
          bnOrZero(sellAmountCryptoPrecision).isZero() ? '' : sellAmountCryptoPrecision
        }
        sellAmountUserCurrency={
          bnOrZero(inputSellAmountUserCurrency).isZero() ? '' : inputSellAmountUserCurrency
        }
        sellAsset={sellAsset}
        sellAccountId={sellAccountId}
        onSwitchAssets={handleSwitchAssets}
        isSwitchAssetsDisabled={isNativeEvmAsset(buyAsset.assetId)}
        onChangeIsInputtingFiatSellAmount={setIsInputtingFiatSellAmount}
        onChangeSellAmountCryptoPrecision={setSellAmountCryptoPrecision}
        setSellAsset={setSellAsset}
        setSellAccountId={setSellAccountId}
        assetFilterPredicate={sellAssetFilterPredicate}
        chainIdFilterPredicate={chainIdFilterPredicate}
        selectedSellAssetChainId={selectedSellAssetChainId}
        onSellAssetChainIdChange={setSelectedSellAssetChainId}
      >
        <Stack>
          <LimitOrderBuyAsset
            isLoading={isLoading}
            asset={buyAsset}
            accountId={buyAccountId}
            onAccountIdChange={setBuyAccountId}
            onSetBuyAsset={setBuyAsset}
            assetFilterPredicate={buyAssetFilterPredicate}
            chainIdFilterPredicate={chainIdFilterPredicate}
            selectedChainId={selectedBuyAssetChainId}
            onSelectedChainIdChange={setSelectedBuyAssetChainId}
          />
          <Divider />
          <LimitOrderConfig
            sellAsset={sellAsset}
            buyAsset={buyAsset}
            isLoading={isLoading}
            marketPriceBuyAsset={marketPriceBuyAsset}
            networkFeesImpactDecimalPercentage={networkFeesImpactDecimalPercentage}
            networkFeesImpactCryptoPrecision={networkFeesImpactCryptoPrecision}
          />
        </Stack>
      </SharedTradeInputBody>
    )
  }, [
    buyAsset,
    isInputtingFiatSellAmount,
    isLoading,
    sellAmountCryptoPrecision,
    inputSellAmountUserCurrency,
    sellAsset,
    sellAccountId,
    handleSwitchAssets,
    setIsInputtingFiatSellAmount,
    setSellAmountCryptoPrecision,
    setSellAsset,
    setSellAccountId,
    sellAssetFilterPredicate,
    chainIdFilterPredicate,
    buyAccountId,
    setBuyAccountId,
    setBuyAsset,
    buyAssetFilterPredicate,
    marketPriceBuyAsset,
    selectedBuyAssetChainId,
    setSelectedBuyAssetChainId,
    selectedSellAssetChainId,
    setSelectedSellAssetChainId,
    networkFeesImpactDecimalPercentage,
    networkFeesImpactCryptoPrecision,
  ])

  const affiliateFeeAfterDiscountUserCurrency = useMemo(() => {
    return bn(feeUsd).times(userCurrencyRate).toFixed(2, BigNumber.ROUND_HALF_UP)
  }, [feeUsd, userCurrencyRate])

  const footerContent = useMemo(() => {
    const shouldInvertRate = priceDirection === PriceDirection.SellAssetDenomination

    return (
      <SharedTradeInputFooter
        affiliateBps={DEFAULT_FEE_BPS}
        affiliateFeeAfterDiscountUserCurrency={affiliateFeeAfterDiscountUserCurrency}
        buyAsset={buyAsset}
        hasUserEnteredAmount={hasUserEnteredAmount}
        inputAmountUsd={inputSellAmountUsd}
        isError={isError}
        isLoading={isLimitOrderQuoteFetching}
        quoteStatusTranslation={quoteStatusTranslation}
        rate={limitPrice.buyAssetDenomination}
        marketRate={marketPriceBuyAsset}
        sellAccountId={sellAccountId}
        shouldDisablePreviewButton={
          !hasUserEnteredAmount ||
          isError ||
          isRecipientAddressEntryActive ||
          bnOrZero(marketPriceBuyAsset).isZero() ||
          bnOrZero(limitPrice.buyAssetDenomination).isZero()
        }
        swapperName={SwapperName.CowSwap}
        swapSource={SwapperName.CowSwap}
        networkFeeFiatUserCurrency={networkFeeUserCurrency}
        sellAsset={sellAsset}
        invertRate={shouldInvertRate}
        noExpand={noExpand}
      >
        <>
          <LimitOrderFooter />
          {renderedRecipientAddress}
        </>
      </SharedTradeInputFooter>
    )
  }, [
    affiliateFeeAfterDiscountUserCurrency,
    buyAsset,
    priceDirection,
    sellAsset,
    hasUserEnteredAmount,
    inputSellAmountUsd,
    isError,
    quoteStatusTranslation,
    limitPrice.buyAssetDenomination,
    marketPriceBuyAsset,
    sellAccountId,
    isRecipientAddressEntryActive,
    networkFeeUserCurrency,
    renderedRecipientAddress,
    noExpand,
    isLimitOrderQuoteFetching,
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
        headerRightContent={headerRightContent}
        isCompact={isCompact}
        isLoading={isLoading}
        SideComponent={CollapsibleLimitOrderList}
        shouldOpenSideComponent
        tradeInputRef={tradeInputRef}
        tradeInputTab={TradeInputTab.LimitOrder}
        onSubmit={handleTradeQuoteConfirm}
        onChangeTab={onChangeTab}
      />
    </>
  )
}
