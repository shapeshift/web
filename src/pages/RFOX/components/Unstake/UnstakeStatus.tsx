import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons'
import { fromAccountId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useQueryClient } from '@tanstack/react-query'
import React, { useCallback, useEffect, useMemo } from 'react'
import { useHistory } from 'react-router'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import type { TextPropTypes } from 'components/Text/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { getTxLink } from 'lib/getTxLink'
import { fromBaseUnit } from 'lib/math'
import { selectAssetById, selectTxById } from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

import { SharedStatus } from '../Shared/SharedStatus'
import type { RfoxUnstakingQuote } from './types'
import { UnstakeRoutePaths, type UnstakeRouteProps } from './types'

type BodyContent = {
  key: TxStatus
  title: string
  body: TextPropTypes['translation']
  element: JSX.Element
}

type UnstakeStatusProps = {
  confirmedQuote: RfoxUnstakingQuote
  txId: string
  onTxConfirmed: () => Promise<void>
}

export const UnstakeStatus: React.FC<UnstakeRouteProps & UnstakeStatusProps> = ({
  confirmedQuote,
  txId,
  onTxConfirmed: handleTxConfirmed,
}) => {
  const queryClient = useQueryClient()
  const history = useHistory()

  const handleGoBack = useCallback(() => {
    history.push(UnstakeRoutePaths.Input)
  }, [history])

  const stakingAssetAccountAddress = useMemo(
    () => fromAccountId(confirmedQuote.stakingAssetAccountId).account,
    [confirmedQuote.stakingAssetAccountId],
  )
  const stakingAsset = useAppSelector(state =>
    selectAssetById(state, confirmedQuote.stakingAssetId),
  )
  const unstakingAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(confirmedQuote.unstakingAmountCryptoBaseUnit, stakingAsset?.precision ?? 0),
    [confirmedQuote.unstakingAmountCryptoBaseUnit, stakingAsset?.precision],
  )

  const serializedTxIndex = useMemo(() => {
    return serializeTxIndex(confirmedQuote.stakingAssetAccountId, txId, stakingAssetAccountAddress)
  }, [confirmedQuote.stakingAssetAccountId, stakingAssetAccountAddress, txId])

  const tx = useAppSelector(state => selectTxById(state, serializedTxIndex))

  useEffect(() => {
    if (tx?.status !== TxStatus.Confirmed) return

    handleTxConfirmed()
  }, [handleTxConfirmed, queryClient, tx?.status])

  const bodyContent: BodyContent | null = useMemo(() => {
    if (!stakingAsset) return null

    switch (tx?.status) {
      case undefined:
      case TxStatus.Pending:
        return {
          key: TxStatus.Pending,
          title: 'pools.waitingForConfirmation',
          body: [
            'RFOX.unstakePending',
            {
              amount: bnOrZero(unstakingAmountCryptoPrecision).toFixed(8),
              symbol: stakingAsset.symbol,
            },
          ],
          element: <CircularProgress size='75px' />,
        }
      case TxStatus.Confirmed:
        return {
          key: TxStatus.Confirmed,
          title: 'common.success',
          body: [
            'RFOX.unstakeSuccess',
            {
              amount: bnOrZero(unstakingAmountCryptoPrecision).toFixed(8),
              symbol: stakingAsset.symbol,
              cooldownPeriod: confirmedQuote.cooldownPeriod,
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
  }, [confirmedQuote.cooldownPeriod, stakingAsset, tx?.status, unstakingAmountCryptoPrecision])

  const txLink = useMemo(
    () => getTxLink({ txId, defaultExplorerBaseUrl: stakingAsset?.explorerTxLink ?? '' }),
    [stakingAsset?.explorerTxLink, txId],
  )

  return <SharedStatus onBack={handleGoBack} txLink={txLink} body={bodyContent} />
}
