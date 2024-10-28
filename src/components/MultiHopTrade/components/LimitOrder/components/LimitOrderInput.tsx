import { Divider, Stack } from '@chakra-ui/react'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import { noop } from 'lodash'
import type { FormEvent } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useHistory } from 'react-router'
import { ethereum, fox } from 'test/mocks/assets'
import { WarningAcknowledgement } from 'components/Acknowledgement/Acknowledgement'
import { useAccountIds } from 'components/MultiHopTrade/hooks/useAccountIds'
import { useReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { TradeInputTab } from 'components/MultiHopTrade/types'
import { WalletActions } from 'context/WalletProvider/actions'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { ParameterModel } from 'lib/fees/parameters/types'
import { selectIsSnapshotApiQueriesPending, selectVotingPower } from 'state/apis/snapshot/selectors'
import { selectIsAnyAccountMetadataLoadedForChainId } from 'state/slices/selectors'
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
import { CollapsibleLimitOrderList } from '../CollapsibleLimitOrderList'
import { LimitOrderRoutePaths } from '../types'
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

  // TODO: Don't use the trade account ID hook. This is temporary during scaffolding
  const { sellAssetAccountId, buyAssetAccountId, setSellAssetAccountId, setBuyAssetAccountId } =
    useAccountIds()

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
  const sellAsset = ethereum // TODO: Implement me
  const buyAsset = fox // TODO: Implement me
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

  const sellAmountUserCurrency = useMemo(() => {
    // TODO: Implement me
    return '0'
  }, [])

  const warningAcknowledgementMessage = useMemo(() => {
    // TODO: Implement me
    return ''
  }, [])

  const headerRightContent = useMemo(() => {
    // TODO: Implement me
    return <></>
  }, [])

  const setBuyAsset = useCallback((_asset: Asset) => {
    // TODO: Implement me
  }, [])
  const setSellAsset = useCallback((_asset: Asset) => {
    // TODO: Implement me
  }, [])
  const handleSwitchAssets = useCallback(() => {
    // TODO: Implement me
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

  const marketPriceBuyAssetCryptoPrecision = '123423'
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
        setSellAsset={setSellAsset}
        setSellAssetAccountId={setSellAssetAccountId}
      >
        <Stack>
          <LimitOrderBuyAsset
            asset={buyAsset}
            accountId={buyAssetAccountId}
            isInputtingFiatSellAmount={isInputtingFiatSellAmount}
            onAccountIdChange={setBuyAssetAccountId}
            onSetBuyAsset={setBuyAsset}
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
    setSellAsset,
    setSellAssetAccountId,
    buyAssetAccountId,
    setBuyAssetAccountId,
    setBuyAsset,
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
        hasUserEnteredAmount={true}
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
