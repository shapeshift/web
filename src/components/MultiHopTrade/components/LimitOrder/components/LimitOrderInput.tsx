import { Button, Divider, HStack, Stack, useMediaQuery } from '@chakra-ui/react'
import { skipToken } from '@reduxjs/toolkit/query'
import type { ChainId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import {
  COW_SWAP_VAULT_RELAYER_ADDRESS,
  getCowNetwork,
  getDefaultSlippageDecimalPercentageForSwapper,
  SwapperName,
} from '@shapeshiftoss/swapper'
import { isNativeEvmAsset } from '@shapeshiftoss/swapper/dist/swappers/utils/helpers/helpers'
import type { Asset, CowSwapError } from '@shapeshiftoss/types'
import { BigNumber, bn, bnOrZero } from '@shapeshiftoss/utils'
import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useHistory } from 'react-router'
import type { Address } from 'viem'
import { WarningAcknowledgement } from 'components/Acknowledgement/Acknowledgement'
import { TradeInputTab } from 'components/MultiHopTrade/types'
import { Text } from 'components/Text'
import { useAccountsFetchQuery } from 'context/AppProvider/hooks/useAccountsFetchQuery'
import { WalletActions } from 'context/WalletProvider/actions'
import { useActions } from 'hooks/useActions'
import { useErrorToast } from 'hooks/useErrorToast/useErrorToast'
import { useWallet } from 'hooks/useWallet/useWallet'
import { getErc20Allowance } from 'lib/utils/evm'
import { useQuoteLimitOrderQuery } from 'state/apis/limit-orders/limitOrderApi'
import { selectCalculatedFees, selectIsVotingPowerLoading } from 'state/apis/snapshot/selectors'
import { LimitPriceMode } from 'state/slices/limitOrderInputSlice/constants'
import { expiryOptionToUnixTimestamp } from 'state/slices/limitOrderInputSlice/helpers'
import { limitOrderInput } from 'state/slices/limitOrderInputSlice/limitOrderInputSlice'
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
  selectLimitPriceMode,
  selectSellAccountId,
  selectSellAssetBalanceCryptoBaseUnit,
  selectUserSlippagePercentage,
  selectUserSlippagePercentageDecimal,
} from 'state/slices/limitOrderInputSlice/selectors'
import { calcLimitPriceBuyAsset } from 'state/slices/limitOrderSlice/helpers'
import { limitOrderSlice } from 'state/slices/limitOrderSlice/limitOrderSlice'
import { selectActiveQuoteNetworkFeeUserCurrency } from 'state/slices/limitOrderSlice/selectors'
import {
  selectIsAnyAccountMetadataLoadedForChainId,
  selectUserCurrencyToUsdRate,
} from 'state/slices/selectors'
import {
  selectIsTradeQuoteRequestAborted,
  selectShouldShowTradeQuoteOrAwaitInput,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

import { SharedSlippagePopover } from '../../SharedTradeInput/SharedSlippagePopover'
import { SharedTradeInput } from '../../SharedTradeInput/SharedTradeInput'
import { SharedTradeInputBody } from '../../SharedTradeInput/SharedTradeInputBody'
import { SharedTradeInputFooter } from '../../SharedTradeInput/SharedTradeInputFooter/SharedTradeInputFooter'
import { getCowSwapErrorTranslation, isCowSwapError } from '../helpers'
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
  const { showErrorToast } = useErrorToast()
  const [isSmallerThanXl] = useMediaQuery(`(max-width: ${breakpoints.xl})`, { ssr: false })

  const userSlippagePercentageDecimal = useAppSelector(selectUserSlippagePercentageDecimal)
  const userSlippagePercentage = useAppSelector(selectUserSlippagePercentage)
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
  const isVotingPowerLoading = useAppSelector(selectIsVotingPowerLoading)
  const userCurrencyRate = useAppSelector(selectUserCurrencyToUsdRate)
  const networkFeeUserCurrency = useAppSelector(selectActiveQuoteNetworkFeeUserCurrency)
  const expiry = useAppSelector(selectExpiry)
  const sellAssetBalanceCryptoBaseUnit = useAppSelector(selectSellAssetBalanceCryptoBaseUnit)
  const limitPriceMode = useAppSelector(selectLimitPriceMode)

  const {
    switchAssets,
    setSellAsset,
    setBuyAsset,
    setSellAccountId,
    setBuyAccountId,
    setLimitPrice,
    setSlippagePreferencePercentage,
    setIsInputtingFiatSellAmount,
    setSellAmountCryptoPrecision,
  } = useActions(limitOrderInput.actions)
  const { setActiveQuote } = useActions(limitOrderSlice.actions)
  const { isFetching: isAccountsMetadataLoading } = useAccountsFetchQuery()

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

  const [shouldShowWarningAcknowledgement, setShouldShowWarningAcknowledgement] = useState(false)
  const [isCheckingAllowance, setIsCheckingAllowance] = useState(false)

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

  const chainIdFilterPredicate = useCallback((chainId: ChainId) => {
    return getCowNetwork(chainId) !== undefined
  }, [])

  const sellAssetFilterPredicate = useCallback(
    (asset: Asset) => {
      return chainIdFilterPredicate(asset.chainId) && !isNativeEvmAsset(asset.assetId)
    },
    [chainIdFilterPredicate],
  )

  const buyAssetFilterPredicate = useCallback(
    (asset: Asset) => {
      return chainIdFilterPredicate(asset.chainId)
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
    data: quoteResponse,
    error: quoteResponseError,
    isFetching: isLimitOrderQuoteFetching,
  } = useQuoteLimitOrderQuery(limitOrderQuoteParams)

  const marketPriceBuyAsset = useMemo(() => {
    // RTK query returns stale data when `skipToken` is used, so we need to handle that case here.
    if (!quoteResponse || limitOrderQuoteParams === skipToken) return '0'

    return calcLimitPriceBuyAsset({
      sellAmountCryptoBaseUnit: quoteResponse.quote.sellAmount,
      buyAmountCryptoBaseUnit: quoteResponse.quote.buyAmount,
      sellAsset,
      buyAsset,
    })
  }, [quoteResponse, limitOrderQuoteParams, sellAsset, buyAsset])

  // Update the limit price when the market price changes.
  useEffect(() => {
    // Don't update if the user has a custom value configured.
    if (limitPriceMode !== LimitPriceMode.CustomValue) {
      setLimitPrice({ marketPriceBuyAsset })
    }
  }, [limitPriceMode, marketPriceBuyAsset, setLimitPrice])

  const onSubmit = useCallback(async () => {
    // No preview happening if wallet isn't connected i.e is using the demo wallet
    if (!isConnected || isDemoWallet) {
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
        history.push(LimitOrderRoutePaths.AllowanceApproval)
        return
      }

      // Otherwise, proceed with confirmation
      history.push(LimitOrderRoutePaths.Confirm)
      return
    } catch (e) {
      showErrorToast(e)
    } finally {
      setIsCheckingAllowance(false)
    }
  }, [
    isConnected,
    isDemoWallet,
    quoteResponse,
    limitOrderQuoteParams,
    sellAccountId,
    setActiveQuote,
    expiry,
    buyAmountCryptoBaseUnit,
    handleConnect,
    history,
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
    history.push(LimitOrderRoutePaths.Orders)
  }, [history])

  const isLoading = useMemo(() => {
    return (
      isCheckingAllowance ||
      isLimitOrderQuoteFetching ||
      // No account meta loaded for that chain
      !isAnyAccountMetadataLoadedForChainId ||
      (!shouldShowTradeQuoteOrAwaitInput && !isTradeQuoteRequestAborted) ||
      // Only consider snapshot API queries as pending if we don't have voting power yet
      // if we do, it means we have persisted or cached (both stale) data, which is enough to let the user continue
      // as we are optimistic and don't want to be waiting for a potentially very long time for the snapshot API to respond
      isVotingPowerLoading
    )
  }, [
    isCheckingAllowance,
    isAnyAccountMetadataLoadedForChainId,
    isLimitOrderQuoteFetching,
    isTradeQuoteRequestAborted,
    isVotingPowerLoading,
    shouldShowTradeQuoteOrAwaitInput,
  ])

  const headerRightContent = useMemo(() => {
    return (
      <HStack>
        {Boolean(isCompact || isSmallerThanXl) && (
          <Button size='xs' borderRadius='full' onClick={handleShowLimitOrdersList}>
            <Text translation='limitOrder.viewOrders' />
          </Button>
        )}
        <SharedSlippagePopover
          defaultSlippagePercentage={defaultSlippagePercentage}
          quoteSlippagePercentage={undefined} // No slippage returned by CoW
          userSlippagePercentage={userSlippagePercentage}
          setUserSlippagePercentage={setSlippagePreferencePercentage}
        />
      </HStack>
    )
  }, [
    isCompact,
    isSmallerThanXl,
    defaultSlippagePercentage,
    setSlippagePreferencePercentage,
    handleShowLimitOrdersList,
    userSlippagePercentage,
  ])

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
        isSwitchAssetsDisabled={isNativeEvmAsset(buyAsset.assetId)}
        onChangeIsInputtingFiatSellAmount={setIsInputtingFiatSellAmount}
        onChangeSellAmountCryptoPrecision={setSellAmountCryptoPrecision}
        setSellAsset={setSellAsset}
        setSellAccountId={setSellAccountId}
        assetFilterPredicate={sellAssetFilterPredicate}
        chainIdFilterPredicate={chainIdFilterPredicate}
      >
        <Stack>
          <LimitOrderBuyAsset
            isLoading={isLoading}
            asset={buyAsset}
            accountId={buyAccountId}
            isInputtingFiatSellAmount={isInputtingFiatSellAmount}
            onAccountIdChange={setBuyAccountId}
            onSetBuyAsset={setBuyAsset}
            assetFilterPredicate={buyAssetFilterPredicate}
            chainIdFilterPredicate={chainIdFilterPredicate}
          />
          <Divider />
          <LimitOrderConfig
            sellAsset={sellAsset}
            buyAsset={buyAsset}
            isLoading={isLoading}
            marketPriceBuyAsset={marketPriceBuyAsset}
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
    marketPriceBuyAsset,
    sellAccountId,
    sellAmountCryptoPrecision,
    sellAsset,
    buyAssetFilterPredicate,
    chainIdFilterPredicate,
    sellAssetFilterPredicate,
    setBuyAccountId,
    setBuyAsset,
    setIsInputtingFiatSellAmount,
    setSellAccountId,
    setSellAmountCryptoPrecision,
    setSellAsset,
    switchAssets,
  ])

  const affiliateFeeAfterDiscountUserCurrency = useMemo(() => {
    return bn(feeUsd).times(userCurrencyRate).toFixed(2, BigNumber.ROUND_HALF_UP)
  }, [feeUsd, userCurrencyRate])

  const { quoteStatusTranslation, isError } = useMemo(() => {
    switch (true) {
      case isAccountsMetadataLoading && !(sellAccountId || buyAccountId):
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
      case !isConnected || isDemoWallet:
        // We got a happy path quote, but we may still be in the context of the demo wallet
        return { quoteStatusTranslation: 'common.connectWallet', isError: false }
      default:
        return { quoteStatusTranslation: 'trade.previewTrade', isError: false }
    }
  }, [
    buyAccountId,
    buyAsset.chainId,
    hasUserEnteredAmount,
    isAccountsMetadataLoading,
    isConnected,
    isDemoWallet,
    quoteResponseError,
    recipientAddress,
    sellAccountId,
    sellAsset.assetId,
    sellAsset.chainId,
    sellAssetBalanceCryptoBaseUnit,
    shouldShowTradeQuoteOrAwaitInput,
  ])

  const footerContent = useMemo(() => {
    return (
      <SharedTradeInputFooter
        affiliateBps={feeBps.toFixed(0)}
        affiliateFeeAfterDiscountUserCurrency={affiliateFeeAfterDiscountUserCurrency}
        buyAsset={buyAsset}
        hasUserEnteredAmount={hasUserEnteredAmount}
        inputAmountUsd={inputSellAmountUsd}
        isError={isError}
        isLoading={isLoading}
        quoteStatusTranslation={quoteStatusTranslation}
        rate={
          bnOrZero(limitPrice.buyAssetDenomination).isZero()
            ? undefined
            : limitPrice.buyAssetDenomination
        }
        sellAccountId={sellAccountId}
        shouldDisableGasRateRowClick
        shouldDisablePreviewButton={
          !hasUserEnteredAmount || isError || isRecipientAddressEntryActive
        }
        swapperName={SwapperName.CowSwap}
        swapSource={SwapperName.CowSwap}
        networkFeeFiatUserCurrency={networkFeeUserCurrency}
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
    isError,
    isLoading,
    limitPrice,
    sellAccountId,
    isRecipientAddressEntryActive,
    sellAsset,
    renderedRecipientAddress,
    networkFeeUserCurrency,
    quoteStatusTranslation,
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
