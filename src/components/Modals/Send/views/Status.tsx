import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons'
import { Card } from '@chakra-ui/react'
import { fromAssetId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { InterpolationOptions } from 'node-polyglot'
import React, { useCallback, useMemo } from 'react'
import { useWatch } from 'react-hook-form'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { useSafeTxQuery } from 'hooks/queries/useSafeTx'
import { useModal } from 'hooks/useModal/useModal'
import { useTxStatus } from 'hooks/useTxStatus/useTxStatus'
import { getTxLink } from 'lib/getTxLink'
import { SharedStatus } from 'pages/RFOX/components/Shared/SharedStatus'
import { selectAssetById, selectFeeAssetByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { SendInput } from '../Form'
import { SendFormFields } from '../SendCommon'

type BodyContent = {
  key: TxStatus
  title: string | [string, InterpolationOptions]
  body: string | [string, Record<string, string | number>]
  element: JSX.Element
}

export const Status: React.FC = () => {
  const send = useModal('send')
  const qrCode = useModal('qrCode')

  const handleClose = useCallback(() => {
    send.close()
    qrCode.close()
  }, [qrCode, send])

  const txHash = useWatch<SendInput, SendFormFields.TxHash>({ name: SendFormFields.TxHash })
  const assetId = useWatch<SendInput, SendFormFields.AssetId>({ name: SendFormFields.AssetId })
  const amountCryptoPrecision = useWatch<SendInput, SendFormFields.AmountCryptoPrecision>({
    name: SendFormFields.AmountCryptoPrecision,
  })
  const accountId = useWatch<SendInput, SendFormFields.AccountId>({
    name: SendFormFields.AccountId,
  })
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const feeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(assetId).chainId),
  )

  const txStatus = useTxStatus({
    accountId,
    txHash: txHash || null,
  })
  const { data: maybeSafeTx } = useSafeTxQuery({
    maybeSafeTxHash: txHash,
    accountId,
  })

  const bodyContent: BodyContent | null = useMemo(() => {
    if (!asset) return null

    if (maybeSafeTx?.isQueuedSafeTx) {
      return {
        key: TxStatus.Pending,
        title: [
          'common.safeProposalQueued',
          {
            currentConfirmations: maybeSafeTx?.transaction?.confirmations?.length,
            confirmationsRequired: maybeSafeTx?.transaction?.confirmationsRequired,
          },
        ],
        body: [
          'modals.send.status.pendingBody',
          {
            amount: amountCryptoPrecision,
            symbol: asset.symbol,
          },
        ],

        element: <CircularProgress size='75px' />,
      }
    }

    if (maybeSafeTx?.isExecutedSafeTx) {
      return {
        key: TxStatus.Confirmed,
        title: 'common.success',
        body: [
          'modals.send.youHaveSent',
          {
            amount: amountCryptoPrecision,
            symbol: asset.symbol,
          },
        ],
        element: <CheckCircleIcon color='green.500' boxSize='75px' />,
      }
    }

    switch (txStatus) {
      case undefined:
      case TxStatus.Pending:
        return {
          key: TxStatus.Pending,
          title: 'pools.waitingForConfirmation',
          body: [
            'modals.send.status.pendingBody',
            {
              amount: amountCryptoPrecision,
              symbol: asset.symbol,
            },
          ],
          element: <CircularProgress size='75px' />,
        }
      case TxStatus.Confirmed:
        return {
          key: TxStatus.Confirmed,
          title: 'common.success',
          body: [
            'modals.send.youHaveSent',
            {
              amount: amountCryptoPrecision,
              symbol: asset.symbol,
            },
          ],
          element: <CheckCircleIcon color='green.500' boxSize='75px' />,
        }
      case TxStatus.Failed:
        return {
          key: TxStatus.Failed,
          title: 'transactionRow.failed',
          body: 'common.transactionFailedBody',
          element: <WarningIcon color='red.500' boxSize='75px' />,
        }
      default:
        return null
    }
  }, [
    asset,
    maybeSafeTx?.isQueuedSafeTx,
    maybeSafeTx?.isExecutedSafeTx,
    maybeSafeTx?.transaction?.confirmations?.length,
    maybeSafeTx?.transaction?.confirmationsRequired,
    txStatus,
    amountCryptoPrecision,
  ])

  const txLink = useMemo(() => {
    if (!feeAsset) return
    if (!txHash) return

    return getTxLink({
      txId: txHash,
      defaultExplorerBaseUrl: feeAsset.explorerTxLink,
      accountId,
      maybeSafeTx,
    })
  }, [accountId, feeAsset, maybeSafeTx, txHash])

  return (
    <Card width='full'>
      <SharedStatus txLink={txLink} body={bodyContent} onClose={handleClose} />
    </Card>
  )
}
