import { CheckCircleIcon, WarningTwoIcon } from '@chakra-ui/icons'
import { tcyAssetId } from '@shapeshiftoss/caip'
import { SwapperName, THOR_PRECISION } from '@shapeshiftoss/swapper'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { DialogHeader } from '@/components/Modal/components/DialogHeader'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import { TransactionStatusDisplay } from '@/components/TransactionStatusDisplay/TransactionStatusDisplay'
import { useSafeTxQuery } from '@/hooks/queries/useSafeTx'
import { useTxStatus } from '@/hooks/useTxStatus/useTxStatus'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { getTxLink } from '@/lib/getTxLink'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type TransactionStatusProps = {
  txId: string
  setTxId: (txId: string) => void
  onTxConfirmed: () => Promise<void>
  translationPrefix: 'stake' | 'unstake' | 'claim'
  accountId: string
  amountCryptoPrecision: string
  isDialog: boolean
  headerText?: string
  displayGoBack: boolean
  initialRoute?: string
}

export const ReusableStatus = ({
  txId,
  setTxId,
  onTxConfirmed: handleTxConfirmed,
  translationPrefix,
  accountId,
  amountCryptoPrecision,
  isDialog,
  headerText,
  displayGoBack,
  initialRoute,
}: TransactionStatusProps) => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const tcyAsset = useAppSelector(state => selectAssetById(state, tcyAssetId))

  const txStatus = useTxStatus({
    accountId: accountId ?? '',
    txHash: txId,
    onTxStatusConfirmed: handleTxConfirmed,
  })

  const { data: maybeSafeTx } = useSafeTxQuery({
    maybeSafeTxHash: txId ?? undefined,
    accountId,
  })

  const txLink = useMemo(
    () =>
      getTxLink({
        txId,
        defaultExplorerBaseUrl: tcyAsset?.explorerTxLink ?? '',
        accountId,
        maybeSafeTx,
        stepSource: SwapperName.Thorchain,
      }),
    [accountId, maybeSafeTx, tcyAsset?.explorerTxLink, txId],
  )

  const handleViewTransaction = useCallback(() => {
    if (txLink) window.open(txLink, '_blank')
  }, [txLink])

  const handleGoBack = useCallback(() => {
    if (!initialRoute) return

    navigate(initialRoute)
  }, [navigate, initialRoute])

  const statusContent = useMemo(() => {
    if (!tcyAsset) return null

    if (maybeSafeTx?.isQueuedSafeTx) {
      return (
        <TransactionStatusDisplay
          isLoading
          title={translate('common.safeProposalQueued', {
            currentConfirmations: maybeSafeTx?.transaction?.confirmations?.length,
            confirmationsRequired: maybeSafeTx?.transaction?.confirmationsRequired,
          })}
          subtitle={translate(`TCY.${translationPrefix}Pending`, {
            amount: bnOrZero(amountCryptoPrecision).toFixed(THOR_PRECISION),
            symbol: tcyAsset.symbol,
          })}
          primaryButtonText={translate('trade.viewTransaction')}
          onPrimaryClick={handleViewTransaction}
        />
      )
    }

    if (maybeSafeTx?.isExecutedSafeTx && maybeSafeTx?.transaction?.transactionHash) {
      setTxId(maybeSafeTx.transaction.transactionHash)
    }

    switch (txStatus) {
      case undefined:
      case TxStatus.Pending:
        return (
          <TransactionStatusDisplay
            isLoading
            title={translate('pools.waitingForConfirmation')}
            subtitle={translate(`TCY.${translationPrefix}Status.pendingSubtitle`, {
              amount: bnOrZero(amountCryptoPrecision).toFixed(8),
              symbol: tcyAsset.symbol,
            })}
            primaryButtonText={translate('trade.viewTransaction')}
            onPrimaryClick={handleViewTransaction}
            secondaryButtonText={
              displayGoBack ? translate(`TCY.${translationPrefix}Status.goBack`) : undefined
            }
            onSecondaryClick={displayGoBack ? handleGoBack : undefined}
          />
        )
      case TxStatus.Confirmed:
        return (
          <TransactionStatusDisplay
            icon={CheckCircleIcon}
            iconColor='green.500'
            title={translate(`TCY.${translationPrefix}Status.successTitle`)}
            subtitle={translate(`TCY.${translationPrefix}Status.successSubtitle`, {
              amount: bnOrZero(amountCryptoPrecision).toFixed(8),
              symbol: tcyAsset.symbol,
            })}
            primaryButtonText={translate('trade.viewTransaction')}
            onPrimaryClick={handleViewTransaction}
            secondaryButtonText={
              displayGoBack ? translate(`TCY.${translationPrefix}Status.goBack`) : undefined
            }
            onSecondaryClick={displayGoBack ? handleGoBack : undefined}
          />
        )
      case TxStatus.Failed:
        return (
          <TransactionStatusDisplay
            icon={WarningTwoIcon}
            iconColor='red.500'
            title={translate(`TCY.${translationPrefix}Status.failedTitle`)}
            subtitle={translate(`TCY.${translationPrefix}Status.failedSubtitle`)}
            primaryButtonText={translate('trade.viewTransaction')}
            onPrimaryClick={handleViewTransaction}
            secondaryButtonText={
              displayGoBack ? translate(`TCY.${translationPrefix}Status.goBack`) : undefined
            }
            onSecondaryClick={displayGoBack ? handleGoBack : undefined}
          />
        )
      default:
        return null
    }
  }, [
    tcyAsset,
    txStatus,
    maybeSafeTx,
    amountCryptoPrecision,
    handleViewTransaction,
    handleGoBack,
    setTxId,
    translationPrefix,
    translate,
    displayGoBack,
  ])

  if (!isDialog) return <SlideTransition>{statusContent}</SlideTransition>

  return (
    <SlideTransition>
      <DialogHeader>
        <DialogHeader.Middle>
          <RawText>{headerText}</RawText>
        </DialogHeader.Middle>
      </DialogHeader>
      {statusContent}
    </SlideTransition>
  )
}
