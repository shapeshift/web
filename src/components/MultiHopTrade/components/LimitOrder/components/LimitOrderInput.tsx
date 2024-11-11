import { Divider, Stack } from '@chakra-ui/react'
import { skipToken } from '@reduxjs/toolkit/query'
import { fromAccountId } from '@shapeshiftoss/caip'
import { getDefaultSlippageDecimalPercentageForSwapper, SwapperName } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import { BigNumber, bn, bnOrZero, fromBaseUnit, toBaseUnit } from '@shapeshiftoss/utils'
import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useHistory } from 'react-router'
import type { Address } from 'viem'
import { WarningAcknowledgement } from 'components/Acknowledgement/Acknowledgement'
import { TradeInputTab } from 'components/MultiHopTrade/types'
import { WalletActions } from 'context/WalletProvider/actions'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useWallet } from 'hooks/useWallet/useWallet'
import { calculateFees } from 'lib/fees/model'
import type { ParameterModel } from 'lib/fees/parameters/types'
import { useQuoteLimitOrderQuery } from 'state/apis/limit-orders/limitOrderApi'
import { selectIsSnapshotApiQueriesPending, selectVotingPower } from 'state/apis/snapshot/selectors'
import { limitOrderInput } from 'state/slices/limitOrderInputSlice/limitOrderInputSlice'
import {
  selectInputSellAsset,
  selectUserSlippagePercentage,
} from 'state/slices/limitOrderInputSlice/selectors'
import {
  selectFirstAccountIdByChainId,
  selectInputBuyAsset,
  selectIsAnyAccountMetadataLoadedForChainId,
  selectMarketDataByAssetIdUserCurrency,
  selectUsdRateByAssetId,
  selectUserCurrencyToUsdRate,
} from 'state/slices/selectors'
import {
  selectCalculatedFees,
  selectIsTradeQuoteRequestAborted,
  selectShouldShowTradeQuoteOrAwaitInput,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { SharedSlippagePopover } from '../../SharedTradeInput/SharedSlippagePopover'
import { SharedTradeInput } from '../../SharedTradeInput/SharedTradeInput'
import { SharedTradeInputBody } from '../../SharedTradeInput/SharedTradeInputBody'
import { SharedTradeInputFooter } from '../../SharedTradeInput/SharedTradeInputFooter/SharedTradeInputFooter'
import { useLimitOrderRecipientAddress } from '../hooks/useLimitOrderRecipientAddress'
import { LimitOrderRoutePaths } from '../types'
import { CollapsibleLimitOrderList } from './CollapsibleLimitOrderList'
import { LimitOrderBuyAsset } from './LimitOrderBuyAsset'
import { LimitOrderConfig } from './LimitOrderConfig'

const votingPowerParams: { feeModel: ParameterModel } = { feeModel: 'SWAPPER' }
const thorVotingPowerParams: { feeModel: ParameterModel } = { feeModel: 'THORSWAP' }

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
  const dispatch = useAppDispatch()

  const history = useHistory()
  const { handleSubmit } = useFormContext()
  const { showErrorToast } = useErrorHandler()

  const userSlippagePercentage = useAppSelector(selectUserSlippagePercentage)
  const sellAsset = useAppSelector(selectInputSellAsset)
  const buyAsset = useAppSelector(selectInputBuyAsset)

  // TODO: Move to redux slice
  const [limitPriceBuyAsset, setLimitPriceBuyAsset] = useState('0')

  const defaultAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, sellAsset.chainId),
  )
  const defaultSlippagePercentage = useMemo(() => {
    return bn(getDefaultSlippageDecimalPercentageForSwapper(SwapperName.CowSwap))
      .times(100)
      .toString()
  }, [])

  const [buyAccountId, setBuyAccountId] = useState(defaultAccountId)
  const [sellAccountId, setSellAccountId] = useState(defaultAccountId)

  const { isRecipientAddressEntryActive, renderedRecipientAddress, recipientAddress } =
    useLimitOrderRecipientAddress({
      buyAsset,
      buyAccountId,
      sellAccountId,
    })

  const [isInputtingFiatSellAmount, setIsInputtingFiatSellAmount] = useState(false)
  const [isConfirmationLoading, setIsConfirmationLoading] = useState(false)
  const [shouldShowWarningAcknowledgement, setShouldShowWarningAcknowledgement] = useState(false)
  const [sellAmountCryptoPrecision, setSellAmountCryptoPrecision] = useState('0')
  const shouldShowTradeQuoteOrAwaitInput = useAppSelector(selectShouldShowTradeQuoteOrAwaitInput)
  const isSnapshotApiQueriesPending = useAppSelector(selectIsSnapshotApiQueriesPending)
  const isTradeQuoteRequestAborted = useAppSelector(selectIsTradeQuoteRequestAborted)
  const hasUserEnteredAmount = true
  const votingPower = useAppSelector(state => selectVotingPower(state, votingPowerParams))
  const thorVotingPower = useAppSelector(state => selectVotingPower(state, thorVotingPowerParams))
  const sellAssetUsdRate = useAppSelector(state => selectUsdRateByAssetId(state, sellAsset.assetId))
  const userCurrencyRate = useAppSelector(selectUserCurrencyToUsdRate)
  const isAnyAccountMetadataLoadedForChainIdFilter = useMemo(
    () => ({ chainId: sellAsset.chainId }),
    [sellAsset.chainId],
  )
  const isAnyAccountMetadataLoadedForChainId = useAppSelector(state =>
    selectIsAnyAccountMetadataLoadedForChainId(state, isAnyAccountMetadataLoadedForChainIdFilter),
  )

  const isVotingPowerLoading = useMemo(
    () => isSnapshotApiQueriesPending && votingPower === undefined,
    [isSnapshotApiQueriesPending, votingPower],
  )

  const sellAssetMarketDataUserCurrency = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, sellAsset.assetId),
  )

  const sellAmountUserCurrency = useMemo(() => {
    return bnOrZero(sellAmountCryptoPrecision)
      .times(sellAssetMarketDataUserCurrency.price)
      .toFixed()
  }, [sellAssetMarketDataUserCurrency.price, sellAmountCryptoPrecision])

  const sellAmountUsd = useMemo(() => {
    return bnOrZero(sellAmountCryptoPrecision)
      .times(sellAssetUsdRate ?? '0')
      .toFixed()
  }, [sellAmountCryptoPrecision, sellAssetUsdRate])

  const warningAcknowledgementMessage = useMemo(() => {
    // TODO: Implement me
    return ''
  }, [])

  const handleSwitchAssets = useCallback(() => {
    dispatch(limitOrderInput.actions.switchAssets())
  }, [dispatch])

  const handleSetSellAsset = useCallback(
    (newSellAsset: Asset) => {
      dispatch(limitOrderInput.actions.setSellAsset(newSellAsset))
    },
    [dispatch],
  )

  const handleSetBuyAsset = useCallback(
    (newBuyAsset: Asset) => {
      dispatch(limitOrderInput.actions.setBuyAsset(newBuyAsset))
    },
    [dispatch],
  )

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

  const affiliateBps = useMemo(() => {
    const tradeAmountUsd = bnOrZero(sellAssetUsdRate).times(sellAmountCryptoPrecision)

    const { feeBps } = calculateFees({
      tradeAmountUsd,
      foxHeld: bnOrZero(votingPower),
      thorHeld: bnOrZero(thorVotingPower),
      feeModel: 'SWAPPER',
    })

    return feeBps.toFixed(0)
  }, [sellAmountCryptoPrecision, sellAssetUsdRate, thorVotingPower, votingPower])

  const limitOrderQuoteParams = useMemo(() => {
    // Return skipToken if any required params are missing
    if (bnOrZero(sellAmountCryptoBaseUnit).isZero()) {
      return skipToken
    }

    return {
      sellAssetId: sellAsset.assetId,
      buyAssetId: buyAsset.assetId,
      chainId: sellAsset.chainId,
      slippageTolerancePercentageDecimal: bn(userSlippagePercentage ?? defaultSlippagePercentage)
        .div(100)
        .toString(),
      affiliateBps,
      sellAccountAddress,
      sellAmountCryptoBaseUnit,
      recipientAddress,
    }
  }, [
    sellAmountCryptoBaseUnit,
    sellAsset.assetId,
    sellAsset.chainId,
    buyAsset.assetId,
    userSlippagePercentage,
    defaultSlippagePercentage,
    affiliateBps,
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
    if (!data) return '0'
    return bnOrZero(fromBaseUnit(data.quote.buyAmount, buyAsset.precision))
      .div(fromBaseUnit(data.quote.sellAmount, sellAsset.precision))
      .toFixed()
  }, [buyAsset.precision, data, sellAsset.precision])

  // Reset the limit price when the market price changes.
  // TODO: If we introduce polling of quotes, we will need to add logic inside `LimitOrderConfig` to
  // not reset the user's config unless the asset pair changes.
  useEffect(() => {
    setLimitPriceBuyAsset(marketPriceBuyAsset)
  }, [marketPriceBuyAsset])

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

  const handleSetUserSlippagePercentage = useCallback(
    (slippagePercentage: string | undefined) => {
      dispatch(limitOrderInput.actions.setSlippagePreferencePercentage(slippagePercentage))
    },
    [dispatch],
  )

  const headerRightContent = useMemo(() => {
    return (
      <SharedSlippagePopover
        defaultSlippagePercentage={defaultSlippagePercentage}
        quoteSlippagePercentage={undefined} // No slippage returned by CoW
        userSlippagePercentage={userSlippagePercentage}
        setUserSlippagePercentage={handleSetUserSlippagePercentage}
      />
    )
  }, [defaultSlippagePercentage, handleSetUserSlippagePercentage, userSlippagePercentage])

  const bodyContent = useMemo(() => {
    return (
      <SharedTradeInputBody
        buyAsset={buyAsset}
        isInputtingFiatSellAmount={isInputtingFiatSellAmount}
        isLoading={isLoading}
        sellAmountCryptoPrecision={sellAmountCryptoPrecision}
        sellAmountUserCurrency={sellAmountUserCurrency}
        sellAsset={sellAsset}
        sellAccountId={sellAccountId}
        handleSwitchAssets={handleSwitchAssets}
        onChangeIsInputtingFiatSellAmount={setIsInputtingFiatSellAmount}
        onChangeSellAmountCryptoPrecision={setSellAmountCryptoPrecision}
        setSellAsset={handleSetSellAsset}
        setSellAccountId={setSellAccountId}
      >
        <Stack>
          <LimitOrderBuyAsset
            asset={buyAsset}
            accountId={buyAccountId}
            isInputtingFiatSellAmount={isInputtingFiatSellAmount}
            onAccountIdChange={setBuyAccountId}
            onSetBuyAsset={handleSetBuyAsset}
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
    isInputtingFiatSellAmount,
    isLoading,
    limitPriceBuyAsset,
    marketPriceBuyAsset,
    sellAccountId,
    sellAmountCryptoPrecision,
    sellAmountUserCurrency,
    sellAsset,
    handleSetBuyAsset,
    handleSetSellAsset,
    handleSwitchAssets,
  ])

  const { feeUsd } = useAppSelector(state =>
    selectCalculatedFees(state, { feeModel: 'SWAPPER', inputAmountUsd: sellAmountUsd }),
  )

  const affiliateFeeAfterDiscountUserCurrency = useMemo(() => {
    return bn(feeUsd).times(userCurrencyRate).toFixed(2, BigNumber.ROUND_HALF_UP)
  }, [feeUsd, userCurrencyRate])

  const footerContent = useMemo(() => {
    return (
      <SharedTradeInputFooter
        affiliateBps={affiliateBps}
        affiliateFeeAfterDiscountUserCurrency={affiliateFeeAfterDiscountUserCurrency}
        buyAsset={buyAsset}
        hasUserEnteredAmount={hasUserEnteredAmount}
        inputAmountUsd={sellAmountUsd}
        isError={Boolean(error)}
        isLoading={isLoading}
        quoteStatusTranslation={'limitOrder.previewOrder'}
        rate={bnOrZero(limitPriceBuyAsset).isZero() ? undefined : limitPriceBuyAsset}
        sellAccountId={sellAccountId}
        shouldDisableGasRateRowClick
        shouldDisablePreviewButton={isRecipientAddressEntryActive}
        swapperName={SwapperName.CowSwap}
        swapSource={SwapperName.CowSwap}
        totalNetworkFeeFiatPrecision='0' // CoW protocol always zero network fee
        sellAsset={sellAsset}
      >
        {renderedRecipientAddress}
      </SharedTradeInputFooter>
    )
  }, [
    affiliateBps,
    affiliateFeeAfterDiscountUserCurrency,
    buyAsset,
    hasUserEnteredAmount,
    sellAmountUsd,
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
