import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons'
import { Card } from '@chakra-ui/react'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import React, { useCallback, useMemo } from 'react'
import { useWatch } from 'react-hook-form'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { useModal } from 'hooks/useModal/useModal'
import { useTxStatus } from 'hooks/useTxStatus/useTxStatus'
import { getTxLink } from 'lib/getTxLink'
import { SharedStatus } from 'pages/RFOX/components/Shared/SharedStatus'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { SendInput } from '../Form'
import { SendFormFields } from '../SendCommon'

type BodyContent = {
  key: TxStatus
  title: string
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
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))

  const txStatus = useTxStatus({
    accountId,
    txHash: txHash || null,
  })

  const bodyContent: BodyContent | null = useMemo(() => {
    if (!asset) return null
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
    }
  }, [txStatus, amountCryptoPrecision, asset])

  const txLink = useMemo(
    () => getTxLink({ txId: txHash ?? '', defaultExplorerBaseUrl: asset?.explorerTxLink ?? '' }),
    [asset?.explorerTxLink, txHash],
  )

  return (
    <Card width='full'>
      <SharedStatus txLink={txLink} body={bodyContent} onClose={handleClose} />
    </Card>
  )
}
