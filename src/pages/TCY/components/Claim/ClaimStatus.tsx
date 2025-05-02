import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons'
import { ModalCloseButton, Stack } from '@chakra-ui/react'
import { SwapperName } from '@shapeshiftoss/swapper'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import React, { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { TCYClaimRoute } from '../../types'
import type { Claim } from './types'

import { DialogHeader } from '@/components/Modal/components/DialogHeader'
import { SlideTransition } from '@/components/SlideTransition'
import { TransactionStatusDisplay } from '@/components/TransactionStatusDisplay/TransactionStatusDisplay'
import { useSafeTxQuery } from '@/hooks/queries/useSafeTx'
import { useTxStatus } from '@/hooks/useTxStatus/useTxStatus'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { getTxLink } from '@/lib/getTxLink'
import { fromBaseUnit } from '@/lib/math'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type ClaimStatusProps = {
  claim: Claim | undefined
  txId: string
  setClaimTxid: (txId: string) => void
  onTxConfirmed: () => Promise<void>
}

export const ClaimStatus: React.FC<ClaimStatusProps> = ({
  claim,
  txId,
  setClaimTxid,
  onTxConfirmed: handleTxConfirmed,
}) => {
  const navigate = useNavigate()
  const translate = useTranslate()
  const txStatus = useTxStatus({
    accountId: claim?.accountId ?? null,
    txHash: txId,
    onTxStatusConfirmed: handleTxConfirmed,
  })

  const handleGoBack = useCallback(() => {
    navigate(TCYClaimRoute.Select)
  }, [navigate])

  const asset = useAppSelector(state => selectAssetById(state, claim?.assetId ?? ''))
  const amountCryptoPrecision = useMemo(
    () => fromBaseUnit(claim?.amountThorBaseUnit ?? '0', asset?.precision ?? 0),
    [claim?.amountThorBaseUnit, asset?.precision],
  )

  const { data: maybeSafeTx } = useSafeTxQuery({
    maybeSafeTxHash: txId ?? undefined,
    accountId: claim?.accountId,
  })

  const txLink = useMemo(
    () =>
      getTxLink({
        txId,
        defaultExplorerBaseUrl: asset?.explorerTxLink ?? '',
        accountId: claim?.accountId,
        maybeSafeTx,
        stepSource: SwapperName.Thorchain,
      }),
    [claim?.accountId, maybeSafeTx, asset?.explorerTxLink, txId],
  )

  const handleViewTransaction = useCallback(() => {
    if (txLink) window.open(txLink, '_blank')
  }, [txLink])

  const renderStatus = () => {
    if (!asset) return null

    if (maybeSafeTx?.isQueuedSafeTx) {
      return (
        <TransactionStatusDisplay
          isLoading
          title={translate('common.safeProposalQueued', {
            currentConfirmations: maybeSafeTx?.transaction?.confirmations?.length,
            confirmationsRequired: maybeSafeTx?.transaction?.confirmationsRequired,
          })}
          subtitle={translate('TCY.claimPending', {
            amount: bnOrZero(amountCryptoPrecision).toFixed(8),
            symbol: asset.symbol,
          })}
          primaryButtonText={translate('trade.viewTransaction')}
          onPrimaryClick={handleViewTransaction}
        />
      )
    }

    if (maybeSafeTx?.isExecutedSafeTx && maybeSafeTx?.transaction?.transactionHash) {
      setClaimTxid(maybeSafeTx.transaction.transactionHash)
    }

    switch (txStatus) {
      case undefined:
      case TxStatus.Pending:
        return (
          <TransactionStatusDisplay
            isLoading
            title={translate('pools.waitingForConfirmation')}
            subtitle={translate('TCY.claimStatus.pendingTitle', {
              amount: bnOrZero(amountCryptoPrecision).toFixed(8),
              symbol: asset.symbol,
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
            title={translate('common.success')}
            subtitle={translate('TCY.claimStatus.successTitle', {
              amount: bnOrZero(amountCryptoPrecision).toFixed(8),
              symbol: asset.symbol,
            })}
            primaryButtonText={translate('trade.viewTransaction')}
            onPrimaryClick={handleViewTransaction}
          />
        )
      case TxStatus.Failed:
        return (
          <TransactionStatusDisplay
            icon={WarningIcon}
            iconColor='red.500'
            title={translate('common.somethingWentWrong')}
            subtitle={translate('common.somethingWentWrongBody')}
            primaryButtonText={translate('trade.viewTransaction')}
            onPrimaryClick={handleViewTransaction}
          />
        )
      default:
        return null
    }
  }

  return (
    <SlideTransition>
      <DialogHeader>
        <DialogHeader.Right>
          <ModalCloseButton onClick={handleGoBack} />
        </DialogHeader.Right>
      </DialogHeader>
      <Stack>{renderStatus()}</Stack>
    </SlideTransition>
  )
}
