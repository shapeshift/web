import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { InterpolationOptions } from 'node-polyglot'
import React, { useCallback, useMemo } from 'react'
import { useHistory } from 'react-router'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import type { TextPropTypes } from 'components/Text/Text'
import { useSafeTxQuery } from 'hooks/queries/useSafeTx'
import { useTxStatus } from 'hooks/useTxStatus/useTxStatus'
import { getTxLink } from 'lib/getTxLink'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { SharedStatus } from '../Shared/SharedStatus'
import type { RfoxChangeAddressQuote } from './types'
import { ChangeAddressRoutePaths, type ChangeAddressRouteProps } from './types'

type BodyContent = {
  key: TxStatus
  title: string | [string, InterpolationOptions]
  body: TextPropTypes['translation']
  element: JSX.Element
}

type ChangeAddressStatusProps = {
  txId: string
  setChangeAddressTxid: (txId: string) => void
  confirmedQuote: RfoxChangeAddressQuote
  onTxConfirmed: () => Promise<void>
}

export const ChangeAddressStatus: React.FC<ChangeAddressRouteProps & ChangeAddressStatusProps> = ({
  txId,
  setChangeAddressTxid,
  confirmedQuote,
  onTxConfirmed: handleTxConfirmed,
}) => {
  const history = useHistory()
  const txStatus = useTxStatus({
    accountId: confirmedQuote.stakingAssetAccountId,
    txHash: txId,
    onTxStatusConfirmed: handleTxConfirmed,
  })

  const stakingAsset = useAppSelector(state =>
    selectAssetById(state, confirmedQuote.stakingAssetId),
  )

  const txLink = useMemo(
    () => getTxLink({ txId, defaultExplorerBaseUrl: stakingAsset?.explorerTxLink ?? '' }),
    [stakingAsset?.explorerTxLink, txId],
  )

  const handleGoBack = useCallback(() => {
    history.push(ChangeAddressRoutePaths.Input)
  }, [history])

  const { data: maybeSafeTx } = useSafeTxQuery({
    maybeSafeTxHash: txId ?? undefined,
    accountId: confirmedQuote.stakingAssetAccountId,
  })

  const bodyContent: BodyContent | null = useMemo(() => {
    // Safe Pending Tx
    if (
      maybeSafeTx?.isSafeTxHash &&
      !maybeSafeTx.transaction?.transactionHash &&
      maybeSafeTx.transaction?.confirmations &&
      maybeSafeTx.transaction.confirmations.length <= maybeSafeTx.transaction.confirmationsRequired
    ) {
      return {
        key: TxStatus.Pending,
        title: [
          'common.safeProposalQueued',
          {
            currentConfirmations: maybeSafeTx.transaction.confirmations.length,
            confirmationsRequired: maybeSafeTx.transaction.confirmationsRequired,
          },
        ],
        body: 'RFOX.changeRewardAddressPending',
        element: <CircularProgress size='75px' />,
      }
    }

    // Safe Success Tx
    if (maybeSafeTx?.transaction?.transactionHash) {
      setChangeAddressTxid(maybeSafeTx.transaction.transactionHash)
    }

    switch (txStatus) {
      case undefined:
      case TxStatus.Pending:
        return {
          key: TxStatus.Pending,
          title: 'pools.waitingForConfirmation',
          body: 'RFOX.changeRewardAddressPending',
          element: <CircularProgress size='75px' />,
        }
      case TxStatus.Confirmed:
        return {
          key: TxStatus.Confirmed,
          title: 'RFOX.addressUpdated',
          body: 'RFOX.changeRewardAddressSuccess',
          element: <CheckCircleIcon color='text.success' boxSize='75px' />,
        }
      case TxStatus.Failed:
        return {
          key: TxStatus.Failed,
          title: 'common.somethingWentWrong',
          body: 'common.somethingWentWrongBody',
          element: <WarningIcon color='text.error' boxSize='75px' />,
        }
      default:
        return null
    }
  }, [
    maybeSafeTx?.isSafeTxHash,
    maybeSafeTx?.transaction?.confirmations,
    maybeSafeTx?.transaction?.confirmationsRequired,
    maybeSafeTx?.transaction?.transactionHash,
    setChangeAddressTxid,
    txStatus,
  ])

  return <SharedStatus onBack={handleGoBack} txLink={txLink} body={bodyContent} />
}
