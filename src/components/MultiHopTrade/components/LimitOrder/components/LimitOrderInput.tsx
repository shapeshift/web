import { Divider, Stack } from '@chakra-ui/react'
import { skipToken } from '@reduxjs/toolkit/query'
import { foxAssetId, fromAccountId, fromAssetId, usdcAssetId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import {
  CoWSwapOrderKind,
  CoWSwapSellTokenSource,
  CoWSwapSigningScheme,
  SwapperName,
} from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import { bnOrZero, toBaseUnit } from '@shapeshiftoss/utils'
import { noop } from 'lodash'
import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useHistory } from 'react-router'
import { zeroAddress } from 'viem'
import { WarningAcknowledgement } from 'components/Acknowledgement/Acknowledgement'
import { useReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { TradeInputTab } from 'components/MultiHopTrade/types'
import { WalletActions } from 'context/WalletProvider/actions'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useWallet } from 'hooks/useWallet/useWallet'
import { localAssetData } from 'lib/asset-service'
import type { ParameterModel } from 'lib/fees/parameters/types'
import { useQuoteLimitOrderQuery } from 'state/apis/limit-orders/limitOrderApi'
import type { LimitOrderQuoteRequest } from 'state/apis/limit-orders/types'
import { PriceQuality } from 'state/apis/limit-orders/types'
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
  const { manualReceiveAddress, walletReceiveAddress } = useReceiveAddress({
    fetchUnchainedAddress: Boolean(wallet && isLedger(wallet)),
  })

  const [sellAsset, setSellAsset] = useState(localAssetData[usdcAssetId] ?? defaultAsset)
  const [buyAsset, setBuyAsset] = useState(localAssetData[foxAssetId] ?? defaultAsset)

  const defaultAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, sellAsset.chainId),
  )

  const [buyAssetAccountId, setBuyAssetAccountId] = useState(defaultAccountId)
  const [sellAssetAccountId, setSellAssetAccountId] = useState(defaultAccountId)

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
    if (!sellAssetAccountId) return

    return fromAccountId(sellAssetAccountId).account
  }, [sellAssetAccountId])

  const limitOrderQuoteParams = useMemo(() => {
    // Return skipToken if any required params are missing
    if (bnOrZero(sellAmountCryptoBaseUnit).isZero()) {
      return skipToken
    }

    const limitOrderQuoteRequest: LimitOrderQuoteRequest = {
      sellToken: fromAssetId(sellAsset.assetId).assetReference,
      buyToken: fromAssetId(buyAsset.assetId).assetReference,
      receiver: undefined, // TODO: implement useReceiveAddress
      appData: undefined, // TODO: create this for limit order!
      appDataHash: undefined, // TODO: create this for limit order!
      sellTokenBalance: CoWSwapSellTokenSource.ERC20,
      from: sellAccountAddress ?? zeroAddress,
      priceQuality: PriceQuality.Optimal,
      signingScheme: CoWSwapSigningScheme.EIP712,
      onChainOrder: undefined,
      kind: CoWSwapOrderKind.Sell,
      sellAmountBeforeFee: sellAmountCryptoBaseUnit,
    }

    return {
      limitOrderQuoteRequest,
      chainId: sellAsset.chainId,
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
    console.log('limit order response:', data)
    console.log('limit order error:', error)
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
        sellAssetAccountId={sellAssetAccountId}
        handleSwitchAssets={handleSwitchAssets}
        onChangeIsInputtingFiatSellAmount={setIsInputtingFiatSellAmount}
        onChangeSellAmountCryptoPrecision={setSellAmountCryptoPrecision}
        setSellAsset={handleSetSellAsset}
        setSellAssetAccountId={setSellAssetAccountId}
      >
        <Stack>
          <LimitOrderBuyAsset
            asset={buyAsset}
            accountId={buyAssetAccountId}
            isInputtingFiatSellAmount={isInputtingFiatSellAmount}
            onAccountIdChange={setBuyAssetAccountId}
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
    sellAssetAccountId,
    handleSwitchAssets,
    handleSetSellAsset,
    setSellAssetAccountId,
    buyAssetAccountId,
    setBuyAssetAccountId,
    handleSetBuyAsset,
    limitPriceBuyAssetCryptoPrecision,
  ])

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
        manualAddressEntryDescription={undefined}
        onRateClick={noop}
        quoteStatusTranslation={'trade.previewTrade'}
        rate={activeQuote?.rate}
        receiveAddress={manualReceiveAddress ?? walletReceiveAddress}
        recipientAddressDescription={undefined}
        sellAsset={sellAsset}
        sellAssetAccountId={sellAssetAccountId}
        shouldDisablePreviewButton={false}
        shouldForceManualAddressEntry={false}
        swapperName={SwapperName.CowSwap}
        swapSource={SwapperName.CowSwap}
        totalNetworkFeeFiatPrecision={'1.1234'}
      />
    )
  }, [
    activeQuote?.rate,
    buyAsset,
    hasUserEnteredAmount,
    isCompact,
    isLoading,
    manualReceiveAddress,
    sellAsset,
    sellAssetAccountId,
    walletReceiveAddress,
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
