import { CheckCircleIcon, WarningTwoIcon } from '@chakra-ui/icons'
import { tcyAssetId } from '@shapeshiftoss/caip'
import { SwapperName } from '@shapeshiftoss/swapper'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useMemo } from 'react'
import { useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { TCYStakeRoute } from '../../types'
import type { StakeFormValues } from './Stake'

import { SlideTransition } from '@/components/SlideTransition'
import { TransactionStatusDisplay } from '@/components/TransactionStatusDisplay/TransactionStatusDisplay'
import { useSafeTxQuery } from '@/hooks/queries/useSafeTx'
import { useTxStatus } from '@/hooks/useTxStatus/useTxStatus'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { getTxLink } from '@/lib/getTxLink'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type StakeStatusProps = {
  txId: string
  setStakeTxid: (txId: string) => void
  onTxConfirmed: () => Promise<void>
}

export const StakeStatus: React.FC<StakeStatusProps> = ({
  txId,
  setStakeTxid,
  onTxConfirmed: handleTxConfirmed,
}) => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const tcyAsset = useAppSelector(state => selectAssetById(state, tcyAssetId))

  const { amountCryptoPrecision, accountId } = useWatch<StakeFormValues>()

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
    navigate(TCYStakeRoute.Input)
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
          subtitle={translate('TCY.stakePending', {
            amount: bnOrZero(amountCryptoPrecision).toFixed(8),
            symbol: tcyAsset.symbol,
          })}
          primaryButtonText={translate('trade.viewTransaction')}
          onPrimaryClick={handleViewTransaction}
        />
      )
    }

    if (maybeSafeTx?.isExecutedSafeTx && maybeSafeTx?.transaction?.transactionHash) {
      setStakeTxid(maybeSafeTx.transaction.transactionHash)
    }

    switch (txStatus) {
      case undefined:
      case TxStatus.Pending:
        return (
          <TransactionStatusDisplay
            isLoading
            title={translate('pools.waitingForConfirmation')}
            subtitle={translate('TCY.stakeStatus.pendingSubtitle', {
              amount: bnOrZero(amountCryptoPrecision).toFixed(8),
              symbol: tcyAsset.symbol,
            })}
            primaryButtonText={translate('TCY.stakeStatus.viewTransaction')}
            onPrimaryClick={handleViewTransaction}
          />
        )
      case TxStatus.Confirmed:
        return (
          <TransactionStatusDisplay
            icon={CheckCircleIcon}
            iconColor='green.500'
            title={translate('TCY.stakeStatus.successTitle')}
            subtitle={translate('TCY.stakeStatus.successSubtitle', {
              amount: bnOrZero(amountCryptoPrecision).toFixed(8),
              symbol: tcyAsset.symbol,
            })}
            secondaryButtonText={translate('TCY.stakeStatus.viewTransaction')}
            onSecondaryClick={handleViewTransaction}
            primaryButtonText={translate('TCY.stakeStatus.goBack')}
            onPrimaryClick={handleGoBack}
          />
        )
      case TxStatus.Failed:
        return (
          <TransactionStatusDisplay
            icon={WarningTwoIcon}
            iconColor='red.500'
            title={translate('TCY.stakeStatus.failedTitle')}
            subtitle={translate('TCY.stakeStatus.failedSubtitle')}
            primaryButtonText={translate('TCY.stakeStatus.goBack')}
            onPrimaryClick={handleGoBack}
          />
        )
      default:
        return null
    }
  }
  return <SlideTransition>{renderStatus()}</SlideTransition>
}
