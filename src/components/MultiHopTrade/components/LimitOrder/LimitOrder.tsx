import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import type { Asset } from '@shapeshiftoss/types'
import type { FormEvent } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { ethereum, fox } from 'test/mocks/assets'
import { WarningAcknowledgement } from 'components/Acknowledgement/Acknowledgement'
import { useReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { TradeInputTab } from 'components/MultiHopTrade/types'
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
  selectBuyAmountAfterFeesUserCurrency,
  selectIsTradeQuoteRequestAborted,
  selectShouldShowTradeQuoteOrAwaitInput,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import { useAccountIds } from '../../hooks/useAccountIds'
import { SharedTradeInput } from '../SharedTradeInput/SharedTradeInput'

const votingPowerParams: { feeModel: ParameterModel } = { feeModel: 'SWAPPER' }

type LimitOrderProps = {
  tradeInputRef: React.MutableRefObject<HTMLDivElement | null>
  isCompact?: boolean
  onChangeTab: (newTab: TradeInputTab) => void
}

// TODO: Implement me
const CollapsibleLimitOrderList = () => <></>

export const LimitOrder = ({ isCompact, tradeInputRef, onChangeTab }: LimitOrderProps) => {
  const {
    dispatch: walletDispatch,
    state: { isConnected, isDemoWallet, wallet },
  } = useWallet()

  const { handleSubmit } = useFormContext()
  const { showErrorToast } = useErrorHandler()
  const { manualReceiveAddress } = useReceiveAddress({
    fetchUnchainedAddress: Boolean(wallet && isLedger(wallet)),
  })
  const { sellAssetAccountId, buyAssetAccountId, setSellAssetAccountId, setBuyAssetAccountId } =
    useAccountIds()

  const [isConfirmationLoading, setIsConfirmationLoading] = useState(false)
  const [shouldShowWarningAcknowledgement, setShouldShowWarningAcknowledgement] = useState(false)

  const buyAmountAfterFeesCryptoPrecision = useAppSelector(selectBuyAmountAfterFeesCryptoPrecision)
  const buyAmountAfterFeesUserCurrency = useAppSelector(selectBuyAmountAfterFeesUserCurrency)
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
      // TODO: Implement me
    } catch (e) {
      showErrorToast(e)
    }

    setIsConfirmationLoading(false)
  }, [handleConnect, isConnected, isDemoWallet, showErrorToast])

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

  return (
    <>
      <WarningAcknowledgement
        message={warningAcknowledgementMessage}
        onAcknowledge={handleWarningAcknowledgementSubmit}
        shouldShowAcknowledgement={shouldShowWarningAcknowledgement}
        setShouldShowAcknowledgement={setShouldShowWarningAcknowledgement}
      />
      <SharedTradeInput
        activeQuote={activeQuote}
        buyAmountAfterFeesCryptoPrecision={buyAmountAfterFeesCryptoPrecision}
        buyAmountAfterFeesUserCurrency={buyAmountAfterFeesUserCurrency}
        buyAsset={buyAsset}
        hasUserEnteredAmount={hasUserEnteredAmount}
        headerRightContent={headerRightContent}
        buyAssetAccountId={buyAssetAccountId}
        sellAssetAccountId={sellAssetAccountId}
        isCompact={isCompact}
        isLoading={isLoading}
        manualReceiveAddress={manualReceiveAddress}
        sellAsset={sellAsset}
        sideComponent={CollapsibleLimitOrderList}
        tradeInputRef={tradeInputRef}
        tradeInputTab={TradeInputTab.LimitOrder}
        footerContent={<></>}
        handleSwitchAssets={handleSwitchAssets}
        onSubmit={handleTradeQuoteConfirm}
        setBuyAsset={setBuyAsset}
        setBuyAssetAccountId={setBuyAssetAccountId}
        setSellAsset={setSellAsset}
        setSellAssetAccountId={setSellAssetAccountId}
        onChangeTab={onChangeTab}
      />
    </>
  )
}
