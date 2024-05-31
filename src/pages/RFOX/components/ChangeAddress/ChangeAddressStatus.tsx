import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons'
import { fromAccountId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import React, { useCallback, useMemo } from 'react'
import { useHistory } from 'react-router'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import type { TextPropTypes } from 'components/Text/Text'
import { getTxLink } from 'lib/getTxLink'
import { selectAssetById, selectTxById } from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

import { SharedStatus } from '../Shared/SharedStatus'
import type { RfoxChangeAddressQuote } from './types'
import { ChangeAddressRoutePaths, type ChangeAddressRouteProps } from './types'

type BodyContent = {
  key: TxStatus
  title: string
  body: TextPropTypes['translation']
  element: JSX.Element
}

type ChangeAddressStatusProps = {
  txId: string
  confirmedQuote: RfoxChangeAddressQuote
}

export const ChangeAddressStatus: React.FC<ChangeAddressRouteProps & ChangeAddressStatusProps> = ({
  txId,
  confirmedQuote,
}) => {
  const history = useHistory()

  const stakingAssetAccountAddress = useMemo(
    () => fromAccountId(confirmedQuote.stakingAssetAccountId).account,
    [confirmedQuote.stakingAssetAccountId],
  )
  const stakingAsset = useAppSelector(state =>
    selectAssetById(state, confirmedQuote.stakingAssetId),
  )

  const serializedTxIndex = useMemo(() => {
    return serializeTxIndex(confirmedQuote.stakingAssetAccountId, txId, stakingAssetAccountAddress)
  }, [confirmedQuote.stakingAssetAccountId, stakingAssetAccountAddress, txId])

  const txLink = useMemo(
    () => getTxLink({ txId, defaultExplorerBaseUrl: stakingAsset?.explorerTxLink ?? '' }),
    [stakingAsset?.explorerTxLink, txId],
  )
  const tx = useAppSelector(state => selectTxById(state, serializedTxIndex))

  const handleGoBack = useCallback(() => {
    history.push(ChangeAddressRoutePaths.Input)
  }, [history])

  const bodyContent: BodyContent | null = useMemo(() => {
    switch (tx?.status) {
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
  }, [tx?.status])

  return <SharedStatus onBack={handleGoBack} txLink={txLink} body={bodyContent} />
}
