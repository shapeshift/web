import { Divider, Stack, useMediaQuery } from '@chakra-ui/react'
import { skipToken } from '@reduxjs/toolkit/query'
import { foxAssetId, fromAccountId, usdcAssetId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import { bnOrZero, toBaseUnit } from '@shapeshiftoss/utils'
import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useHistory } from 'react-router'
import type { Address } from 'viem'
import { WarningAcknowledgement } from 'components/Acknowledgement/Acknowledgement'
import { useManualReceiveAddressIsRequired } from 'components/MultiHopTrade/hooks/useManualReceiveAddressIsRequired'
import { useReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { TradeInputTab } from 'components/MultiHopTrade/types'
import { WalletActions } from 'context/WalletProvider/actions'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useWallet } from 'hooks/useWallet/useWallet'
import { localAssetData } from 'lib/asset-service'
import type { ParameterModel } from 'lib/fees/parameters/types'
import { useQuoteLimitOrderQuery } from 'state/apis/limit-orders/limitOrderApi'
import { selectIsSnapshotApiQueriesPending, selectVotingPower } from 'state/apis/snapshot/selectors'
import { defaultAsset } from 'state/slices/assetsSlice/assetsSlice'
import {
  selectFirstAccountIdByChainId,
  selectIsAnyAccountMetadataLoadedForChainId,
  selectMarketDataByAssetIdUserCurrency,
} from 'state/slices/selectors'
import {
  selectActiveQuote,
  // selectBuyAmountAfterFeesUserCurrency,
  selectIsTradeQuoteRequestAborted,
  selectShouldShowTradeQuoteOrAwaitInput,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

import { SharedRecipientAddress } from '../../SharedTradeInput/SharedRecipientAddress'
import { SharedTradeInput } from '../../SharedTradeInput/SharedTradeInput'
import { SharedTradeInputBody } from '../../SharedTradeInput/SharedTradeInputBody'
import { SharedTradeInputFooter } from '../../SharedTradeInput/SharedTradeInputFooter/SharedTradeInputFooter'
import { LimitOrderRoutePaths } from '../types'
import { CollapsibleLimitOrderList } from './CollapsibleLimitOrderList'
import { LimitOrderBuyAsset } from './LimitOrderBuyAsset'
import { LimitOrderConfig } from './LimitOrderConfig'

const votingPowerParams: { feeModel: ParameterModel } = { feeModel: 'SWAPPER' }

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
    state: { isConnected, isDemoWallet, wallet },
  } = useWallet()

  const history = useHistory()
  const { handleSubmit } = useFormContext()
  const { showErrorToast } = useErrorHandler()
  const [isSmallerThanXl] = useMediaQuery(`(max-width: ${breakpoints.xl})`, { ssr: false })

  const [sellAsset, setSellAsset] = useState(localAssetData[usdcAssetId] ?? defaultAsset)
  const [buyAsset, setBuyAsset] = useState(localAssetData[foxAssetId] ?? defaultAsset)
  const [manualReceiveAddress, setManualReceiveAddress] = useState<string | undefined>(undefined)
  const [manualReceiveAddressIsValid, setManualReceiveAddressIsValid] = useState<
    boolean | undefined
  >(undefined)
  const [manualReceiveAddressIsEditing, setManualReceiveAddressIsEditing] = useState(false)
  const [manualReceiveAddressIsValidating, setManualReceiveAddressIsValidating] = useState(false)

  const defaultAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, sellAsset.chainId),
  )

  const [buyAccountId, setBuyAccountId] = useState(defaultAccountId)
  const [sellAccountId, setSellAccountId] = useState(defaultAccountId)

  const { walletReceiveAddress } = useReceiveAddress({
    fetchUnchainedAddress: Boolean(wallet && isLedger(wallet)),
    buyAccountId,
    buyAsset,
  })

  const [isInputtingFiatSellAmount, setIsInputtingFiatSellAmount] = useState(false)
  const [isConfirmationLoading, setIsConfirmationLoading] = useState(false)
  const [shouldShowWarningAcknowledgement, setShouldShowWarningAcknowledgement] = useState(false)
  const [sellAmountCryptoPrecision, setSellAmountCryptoPrecision] = useState('0')
  // const buyAmountAfterFeesUserCurrency = useAppSelector(selectBuyAmountAfterFeesUserCurrency)
  const shouldShowTradeQuoteOrAwaitInput = useAppSelector(selectShouldShowTradeQuoteOrAwaitInput)
  const isSnapshotApiQueriesPending = useAppSelector(selectIsSnapshotApiQueriesPending)
  const isTradeQuoteRequestAborted = useAppSelector(selectIsTradeQuoteRequestAborted)
  const hasUserEnteredAmount = true
  const votingPower = useAppSelector(state => selectVotingPower(state, votingPowerParams))
  const activeQuote = useAppSelector(selectActiveQuote)
  const isAnyAccountMetadataLoadedForChainIdFilter = useMemo(
    () => ({ chainId: sellAsset.chainId }),
    [sellAsset.chainId],
  )
  const isAnyAccountMetadataLoadedForChainId = useAppSelector(state =>
    selectIsAnyAccountMetadataLoadedForChainId(state, isAnyAccountMetadataLoadedForChainIdFilter),
  )

  const handleOpenCompactQuoteList = useCallback(() => {
    if (!isCompact && !isSmallerThanXl) return
    history.push({ pathname: LimitOrderRoutePaths.QuoteList })
  }, [history, isCompact, isSmallerThanXl])

  const isVotingPowerLoading = useMemo(
    () => isSnapshotApiQueriesPending && votingPower === undefined,
    [isSnapshotApiQueriesPending, votingPower],
  )

  const isLoading = useMemo(
    () =>
      // No account meta loaded for that chain
      !isAnyAccountMetadataLoadedForChainId ||
      (!shouldShowTradeQuoteOrAwaitInput && !isTradeQuoteRequestAborted) ||
      isConfirmationLoading ||
      // Only consider snapshot API queries as pending if we don't have voting power yet
      // if we do, it means we have persisted or cached (both stale) data, which is enough to let the user continue
      // as we are optimistic and don't want to be waiting for a potentially very long time for the snapshot API to respond
      isVotingPowerLoading,
    [
      isAnyAccountMetadataLoadedForChainId,
      shouldShowTradeQuoteOrAwaitInput,
      isTradeQuoteRequestAborted,
      isConfirmationLoading,
      isVotingPowerLoading,
    ],
  )

  const assetMarketDataUserCurrency = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, sellAsset.assetId),
  )

  const sellAmountUserCurrency = useMemo(() => {
    return bnOrZero(sellAmountCryptoPrecision).times(assetMarketDataUserCurrency.price).toFixed()
  }, [assetMarketDataUserCurrency.price, sellAmountCryptoPrecision])

  const warningAcknowledgementMessage = useMemo(() => {
    // TODO: Implement me
    return ''
  }, [])

  const headerRightContent = useMemo(() => {
    // TODO: Implement me
    return <></>
  }, [])

  const handleSwitchAssets = useCallback(() => {
    setSellAsset(buyAsset)
    setBuyAsset(sellAsset)
    setSellAmountCryptoPrecision('0')
  }, [buyAsset, sellAsset])

  const handleSetSellAsset = useCallback(
    (newSellAsset: Asset) => {
      if (newSellAsset === sellAsset) {
        handleSwitchAssets()
        return
      }
      setSellAsset(newSellAsset)
    },
    [handleSwitchAssets, sellAsset],
  )

  const handleSetBuyAsset = useCallback(
    (newBuyAsset: Asset) => {
      if (newBuyAsset === buyAsset) {
        handleSwitchAssets()
        return
      }
      setBuyAsset(newBuyAsset)
    },
    [buyAsset, handleSwitchAssets],
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

  const limitOrderQuoteParams = useMemo(() => {
    // Return skipToken if any required params are missing
    if (bnOrZero(sellAmountCryptoBaseUnit).isZero()) {
      return skipToken
    }

    return {
      sellAssetId: sellAsset.assetId,
      buyAssetId: buyAsset.assetId,
      chainId: sellAsset.chainId,
      slippageTolerancePercentageDecimal: '0', // TODO: wire this up!
      affiliateBps: '0', // TODO: wire this up!
      sellAccountAddress,
      sellAmountCryptoBaseUnit,
    }
  }, [
    buyAsset.assetId,
    sellAccountAddress,
    sellAmountCryptoBaseUnit,
    sellAsset.assetId,
    sellAsset.chainId,
  ])

  const { data, error } = useQuoteLimitOrderQuery(limitOrderQuoteParams)

  useEffect(() => {
    /*
      This is the quote only, not the limit order. The quote is used to determine the market price.
      When submitting a limit order, the buyAmount is (optionally) modified based on the user input,
      and then re-attached to the `LimitOrder` before signing and submitting via our
      `placeLimitOrder` endpoint in limitOrderApi
    */
    console.log('limit order quote response:', data)
    console.log('limit order quote error:', error)
  }, [data, error])

  const marketPriceBuyAssetCryptoPrecision = '123423'

  // TODO: debounce this with `useDebounce` when including in the query
  const [limitPriceBuyAssetCryptoPrecision, setLimitPriceBuyAssetCryptoPrecision] = useState(
    marketPriceBuyAssetCryptoPrecision,
  )

  const bodyContent = useMemo(() => {
    return (
      <SharedTradeInputBody
        buyAsset={buyAsset}
        isInputtingFiatSellAmount={isInputtingFiatSellAmount}
        isLoading={isLoading}
        sellAmountCryptoPrecision={sellAmountCryptoPrecision}
        sellAmountUserCurrency={sellAmountUserCurrency}
        sellAsset={sellAsset}
        sellAssetAccountId={sellAccountId}
        handleSwitchAssets={handleSwitchAssets}
        onChangeIsInputtingFiatSellAmount={setIsInputtingFiatSellAmount}
        onChangeSellAmountCryptoPrecision={setSellAmountCryptoPrecision}
        setSellAsset={handleSetSellAsset}
        setSellAssetAccountId={setSellAccountId}
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
            marketPriceBuyAssetCryptoPrecision={marketPriceBuyAssetCryptoPrecision}
            limitPriceBuyAssetCryptoPrecision={limitPriceBuyAssetCryptoPrecision}
            setLimitPriceBuyAssetCryptoPrecision={setLimitPriceBuyAssetCryptoPrecision}
          />
        </Stack>
      </SharedTradeInputBody>
    )
  }, [
    buyAsset,
    isInputtingFiatSellAmount,
    isLoading,
    sellAmountCryptoPrecision,
    sellAmountUserCurrency,
    sellAsset,
    sellAccountId,
    handleSwitchAssets,
    handleSetSellAsset,
    setSellAccountId,
    buyAccountId,
    setBuyAccountId,
    handleSetBuyAsset,
    limitPriceBuyAssetCryptoPrecision,
  ])

  const onManualReceiveAddressError = useCallback(() => {
    setManualReceiveAddress(undefined)
  }, [])

  const onEditManualReceiveAddress = useCallback(() => {
    setManualReceiveAddressIsEditing(true)
  }, [])

  const onCancelManualReceiveAddress = useCallback(() => {
    setManualReceiveAddressIsEditing(false)
    // Reset form value and valid state on cancel so the valid check doesn't wrongly evaluate to false after bailing out of editing an invalid address
    setManualReceiveAddressIsValid(undefined)
  }, [])

  const onResetManualReceiveAddress = useCallback(() => {
    // Reset the manual receive address in store
    setManualReceiveAddress(undefined)
    // Reset the valid state in store
    setManualReceiveAddressIsValid(undefined)
  }, [])

  const onSubmitManualReceiveAddress = useCallback((address: string) => {
    setManualReceiveAddress(address)
    setManualReceiveAddressIsEditing(false)
  }, [])

  const manualReceiveAddressIsRequired = useManualReceiveAddressIsRequired({
    shouldForceManualAddressEntry: false,
    sellAccountId,
    buyAsset,
    manualReceiveAddress,
    walletReceiveAddress,
  })

  const footerContent = useMemo(() => {
    return (
      <SharedTradeInputFooter
        affiliateBps={'300'}
        affiliateFeeAfterDiscountUserCurrency={'0.01'}
        buyAsset={buyAsset}
        hasUserEnteredAmount={hasUserEnteredAmount}
        inputAmountUsd={'12.34'}
        isCompact={isCompact}
        isError={false}
        isLoading={isLoading}
        onRateClick={handleOpenCompactQuoteList}
        quoteStatusTranslation={'trade.previewTrade'}
        rate={activeQuote?.rate}
        sellAsset={sellAsset}
        sellAssetAccountId={sellAccountId}
        shouldDisablePreviewButton={
          manualReceiveAddressIsRequired ||
          manualReceiveAddressIsValidating ||
          manualReceiveAddressIsEditing ||
          manualReceiveAddressIsValid === false
        }
        swapperName={SwapperName.CowSwap}
        swapSource={SwapperName.CowSwap}
        totalNetworkFeeFiatPrecision={'1.1234'}
      >
        <SharedRecipientAddress
          buyAsset={buyAsset}
          manualReceiveAddress={manualReceiveAddress}
          walletReceiveAddress={walletReceiveAddress}
          onCancel={onCancelManualReceiveAddress}
          onEdit={onEditManualReceiveAddress}
          onError={onManualReceiveAddressError}
          onIsValidatingChange={setManualReceiveAddressIsValidating}
          onIsValidChange={setManualReceiveAddressIsValid}
          onReset={onResetManualReceiveAddress}
          onSubmit={onSubmitManualReceiveAddress}
        />
      </SharedTradeInputFooter>
    )
  }, [
    buyAsset,
    handleOpenCompactQuoteList,
    hasUserEnteredAmount,
    isCompact,
    isLoading,
    activeQuote?.rate,
    sellAsset,
    sellAccountId,
    manualReceiveAddressIsRequired,
    manualReceiveAddressIsValid,
    manualReceiveAddressIsEditing,
    manualReceiveAddressIsValidating,
    manualReceiveAddress,
    walletReceiveAddress,
    onCancelManualReceiveAddress,
    onEditManualReceiveAddress,
    onManualReceiveAddressError,
    onResetManualReceiveAddress,
    onSubmitManualReceiveAddress,
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
