import { CheckCircleIcon, WarningTwoIcon } from '@chakra-ui/icons'
import { tcyAssetId } from '@shapeshiftoss/caip'
import { SwapperName } from '@shapeshiftoss/swapper'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useMemo } from 'react'
import { useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { TCYUnstakeRoute } from '../../types'
import type { UnstakeFormValues } from './Unstake'

import { SlideTransition } from '@/components/SlideTransition'
import { TransactionStatusDisplay } from '@/components/TransactionStatusDisplay/TransactionStatusDisplay'
import { useSafeTxQuery } from '@/hooks/queries/useSafeTx'
import { useTxStatus } from '@/hooks/useTxStatus/useTxStatus'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { getTxLink } from '@/lib/getTxLink'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type UnstakeStatusProps = {
  txId: string
  setUnstakeTxid: (txId: string) => void
  onTxConfirmed: () => Promise<void>
}

export const UnstakeStatus: React.FC<UnstakeStatusProps> = ({
  txId,
  setUnstakeTxid,
  onTxConfirmed: handleTxConfirmed,
}) => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const tcyAsset = useAppSelector(state => selectAssetById(state, tcyAssetId))

  const { amountCryptoPrecision, accountId } = useWatch<UnstakeFormValues>()

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
    navigate(TCYUnstakeRoute.Input)
  }, [navigate])

  const renderStatus = () => {
    if (!tcyAsset) return null

    if (maybeSafeTx?.isQueuedSafeTx) {
      return (
        <TransactionStatusDisplay
          isLoading
          title={translate('common.safeProposalQueued', {
            currentConfirmations: maybeSafeTx?.transaction?.confirmations?.length,
            confirmationsRequired: maybeSafeTx?.transaction?.confirmationsRequired,
          })}
          subtitle={translate('TCY.unstakePending', {
            amount: bnOrZero(amountCryptoPrecision).toFixed(8),
            symbol: tcyAsset.symbol,
          })}
          primaryButtonText={translate('trade.viewTransaction')}
          onPrimaryClick={handleViewTransaction}
        />
      )
    }

    if (maybeSafeTx?.isExecutedSafeTx && maybeSafeTx?.transaction?.transactionHash) {
      setUnstakeTxid(maybeSafeTx.transaction.transactionHash)
    }

    switch (txStatus) {
      case undefined:
      case TxStatus.Pending:
        return (
          <TransactionStatusDisplay
            isLoading
            title={translate('pools.waitingForConfirmation')}
            subtitle={translate('TCY.unstakeStatus.pendingSubtitle', {
              amount: bnOrZero(amountCryptoPrecision).toFixed(8),
              symbol: tcyAsset.symbol,
            })}
            primaryButtonText={translate('trade.viewTransaction')}
            onPrimaryClick={handleViewTransaction}
          />
        )
      case TxStatus.Confirmed:
        return (
          <TransactionStatusDisplay
            icon={CheckCircleIcon}
            iconColor='green.500'
            title={translate('TCY.unstakeStatus.successTitle')}
            subtitle={translate('TCY.unstakeStatus.successSubtitle', {
              amount: bnOrZero(amountCryptoPrecision).toFixed(8),
              symbol: tcyAsset.symbol,
            })}
            secondaryButtonText={translate('trade.viewTransaction')}
            onSecondaryClick={handleViewTransaction}
            primaryButtonText={translate('TCY.unstakeStatus.goBack')}
            onPrimaryClick={handleGoBack}
          />
        )
      case TxStatus.Failed:
        return (
          <TransactionStatusDisplay
            icon={WarningTwoIcon}
            iconColor='red.500'
            title={translate('TCY.unstakeStatus.failedTitle')}
            subtitle={translate('TCY.unstakeStatus.failedSubtitle')}
            primaryButtonText={translate('TCY.unstakeStatus.goBack')}
            onPrimaryClick={handleGoBack}
          />
        )
      default:
        return null
    }
  }
  return <SlideTransition>{renderStatus()}</SlideTransition>
}
