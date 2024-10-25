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
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { ParameterModel } from 'lib/fees/parameters/types'
import { selectIsSnapshotApiQueriesPending, selectVotingPower } from 'state/apis/snapshot/selectors'
import {
  selectHasUserEnteredAmount,
  selectIsAnyAccountMetadataLoadedForChainId,
} from 'state/slices/selectors'
import {
  selectActiveQuote,
  selectBuyAmountAfterFeesCryptoPrecision,
  // selectBuyAmountAfterFeesUserCurrency,
  selectIsTradeQuoteRequestAborted,
  selectShouldShowTradeQuoteOrAwaitInput,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import { SharedTradeInput } from '../../SharedTradeInput/SharedTradeInput'
import { SharedTradeInputBody } from '../../SharedTradeInput/SharedTradeInputBody'
import { SharedTradeInputFooter } from '../../SharedTradeInput/SharedTradeInputFooter'
import { LimitOrderRoutePaths } from '../types'
import { LimitOrderBuyAsset } from './LimitOrderBuyAsset'

const votingPowerParams: { feeModel: ParameterModel } = { feeModel: 'SWAPPER' }

type LimitOrderInputProps = {
  tradeInputRef: React.MutableRefObject<HTMLDivElement | null>
  isCompact?: boolean
  onChangeTab: (newTab: TradeInputTab) => void
}

// TODO: Implement me
const CollapsibleLimitOrderList = () => <></>

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

  const buyAmountAfterFeesCryptoPrecision = useAppSelector(selectBuyAmountAfterFeesCryptoPrecision)
  // const buyAmountAfterFeesUserCurrency = useAppSelector(selectBuyAmountAfterFeesUserCurrency)
  const shouldShowTradeQuoteOrAwaitInput = useAppSelector(selectShouldShowTradeQuoteOrAwaitInput)
  const isSnapshotApiQueriesPending = useAppSelector(selectIsSnapshotApiQueriesPending)
  const isTradeQuoteRequestAborted = useAppSelector(selectIsTradeQuoteRequestAborted)
  const hasUserEnteredAmount = useAppSelector(selectHasUserEnteredAmount)
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
          <Text translation='limitOrder.whenPriceReaches' />
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
  ])

  const footerContent = useMemo(() => {
    return (
      <SharedTradeInputFooter
        isCompact={isCompact}
        isLoading={isLoading}
        receiveAddress={manualReceiveAddress ?? walletReceiveAddress}
        inputAmountUsd={'12.34'}
        affiliateBps={'300'}
        affiliateFeeAfterDiscountUserCurrency={'0.01'}
        quoteStatusTranslation={'trade.previewTrade'}
        manualAddressEntryDescription={undefined}
        onRateClick={noop}
        shouldDisablePreviewButton={false}
        isError={false}
        shouldForceManualAddressEntry={false}
        recipientAddressDescription={undefined}
        priceImpactPercentage={undefined}
        swapSource={SwapperName.CowSwap}
        rate={activeQuote?.rate}
        swapperName={SwapperName.CowSwap}
        slippageDecimal={'0.01'}
        buyAmountAfterFeesCryptoPrecision={buyAmountAfterFeesCryptoPrecision}
        intermediaryTransactionOutputs={undefined}
        buyAsset={buyAsset}
        hasUserEnteredAmount={hasUserEnteredAmount}
        totalProtocolFees={undefined}
        sellAsset={sellAsset}
        sellAssetAccountId={sellAssetAccountId}
        totalNetworkFeeFiatPrecision={'1.1234'}
      />
    )
  }, [
    activeQuote?.rate,
    buyAmountAfterFeesCryptoPrecision,
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
        hasUserEnteredAmount={hasUserEnteredAmount}
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
