import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons'
import { fromAccountId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import React, { useCallback, useMemo } from 'react'
import { useHistory } from 'react-router'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import type { TextPropTypes } from 'components/Text/Text'
import { getTxLink } from 'lib/getTxLink'
import { fromBaseUnit } from 'lib/math'
import { selectAssetById, selectTxById } from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

import { SharedStatus } from '../Shared/SharedStatus'
import type { RfoxClaimQuote } from './types'
import { ClaimRoutePaths, type ClaimRouteProps } from './types'

type BodyContent = {
  key: TxStatus
  title: string
  body: TextPropTypes['translation']
  element: JSX.Element
}

type ClaimStatusProps = {
  confirmedQuote: RfoxClaimQuote
  txId: string
}

export const ClaimStatus: React.FC<ClaimRouteProps & ClaimStatusProps> = ({
  confirmedQuote,
  txId,
}) => {
  const history = useHistory()

  const handleGoBack = useCallback(() => {
    history.push(ClaimRoutePaths.Select)
  }, [history])

  const claimAssetAccountAddress = useMemo(
    () => fromAccountId(confirmedQuote.claimAssetAccountId).account,
    [confirmedQuote.claimAssetAccountId],
  )
  const claimAsset = useAppSelector(state => selectAssetById(state, confirmedQuote.claimAssetId))
  const claimAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(confirmedQuote.claimAmountCryptoBaseUnit, claimAsset?.precision ?? 0),
    [confirmedQuote.claimAmountCryptoBaseUnit, claimAsset?.precision],
  )

  const serializedTxIndex = useMemo(() => {
    return serializeTxIndex(confirmedQuote.claimAssetAccountId, txId, claimAssetAccountAddress)
  }, [confirmedQuote.claimAssetAccountId, claimAssetAccountAddress, txId])

  const tx = useAppSelector(state => selectTxById(state, serializedTxIndex))

  const bodyContent: BodyContent | null = useMemo(() => {
    if (!claimAsset) return null

    switch (tx?.status) {
      case undefined:
      case TxStatus.Pending:
        return {
          key: TxStatus.Pending,
          title: 'pools.waitingForConfirmation',
          body: [
            'RFOX.claimPending',
            { amount: claimAmountCryptoPrecision, symbol: claimAsset.symbol },
          ],
          element: <CircularProgress size='75px' />,
        }
      case TxStatus.Confirmed:
        return {
          key: TxStatus.Confirmed,
          title: 'common.success',
          body: [
            'RFOX.claimSuccess',
            {
              amount: claimAmountCryptoPrecision,
              symbol: claimAsset.symbol,
            },
          ],
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
  }, [claimAsset, tx?.status, claimAmountCryptoPrecision])

  const txLink = useMemo(
    () => getTxLink({ txId, defaultExplorerBaseUrl: claimAsset?.explorerTxLink ?? '' }),
    [claimAsset?.explorerTxLink, txId],
  )

  return <SharedStatus onBack={handleGoBack} txLink={txLink} body={bodyContent} />
}
