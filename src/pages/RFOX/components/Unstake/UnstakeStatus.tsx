import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { InterpolationOptions } from 'node-polyglot'
import React, { useCallback, useMemo } from 'react'
import { useHistory } from 'react-router'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import type { TextPropTypes } from 'components/Text/Text'
import { useSafeTxQuery } from 'hooks/queries/useSafeTx'
import { useTxStatus } from 'hooks/useTxStatus/useTxStatus'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { getTxLink } from 'lib/getTxLink'
import { fromBaseUnit } from 'lib/math'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { SharedStatus } from '../Shared/SharedStatus'
import type { RfoxUnstakingQuote, UnstakeRouteProps } from './types'
import { UnstakeRoutePaths } from './types'

type BodyContent = {
  key: TxStatus
  title: string | [string, InterpolationOptions]
  body: TextPropTypes['translation']
  element: JSX.Element
}

type UnstakeStatusProps = {
  confirmedQuote: RfoxUnstakingQuote
  txId: string
  setUnstakeTxid: (txId: string) => void
  onTxConfirmed: () => Promise<void>
}

export const UnstakeStatus: React.FC<UnstakeRouteProps & UnstakeStatusProps> = ({
  confirmedQuote,
  txId,
  setUnstakeTxid,
  onTxConfirmed: handleTxConfirmed,
}) => {
  const history = useHistory()
  const txStatus = useTxStatus({
    accountId: confirmedQuote.stakingAssetAccountId,
    txHash: txId,
    onTxStatusConfirmed: handleTxConfirmed,
  })

  const handleGoBack = useCallback(() => {
    history.push(UnstakeRoutePaths.Input)
  }, [history])

  const stakingAsset = useAppSelector(state =>
    selectAssetById(state, confirmedQuote.stakingAssetId),
  )
  const unstakingAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(confirmedQuote.unstakingAmountCryptoBaseUnit, stakingAsset?.precision ?? 0),
    [confirmedQuote.unstakingAmountCryptoBaseUnit, stakingAsset?.precision],
  )

  const { data: maybeSafeTx } = useSafeTxQuery({
    maybeSafeTxHash: txId ?? undefined,
    accountId: confirmedQuote.stakingAssetAccountId,
  })

  const bodyContent: BodyContent | null = useMemo(() => {
    if (!stakingAsset) return null

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
          'RFOX.unstakePending',
          {
            amount: bnOrZero(unstakingAmountCryptoPrecision).toFixed(8),
            symbol: stakingAsset.symbol,
          },
        ],
        element: <CircularProgress size='75px' />,
      }
    }

    if (maybeSafeTx?.isExecutedSafeTx && maybeSafeTx?.transaction?.transactionHash) {
      setUnstakeTxid(maybeSafeTx.transaction.transactionHash)
    }

    switch (txStatus) {
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
  }, [
    confirmedQuote.cooldownPeriod,
    maybeSafeTx?.isExecutedSafeTx,
    maybeSafeTx?.isQueuedSafeTx,
    maybeSafeTx?.transaction?.confirmations?.length,
    maybeSafeTx?.transaction?.confirmationsRequired,
    maybeSafeTx?.transaction?.transactionHash,
    setUnstakeTxid,
    stakingAsset,
    txStatus,
    unstakingAmountCryptoPrecision,
  ])

  const txLink = useMemo(
    () =>
      getTxLink({
        txId,
        defaultExplorerBaseUrl: stakingAsset?.explorerTxLink ?? '',
        accountId: confirmedQuote.stakingAssetAccountId,
        maybeSafeTx,
      }),
    [confirmedQuote.stakingAssetAccountId, maybeSafeTx, stakingAsset?.explorerTxLink, txId],
  )

  return <SharedStatus onBack={handleGoBack} txLink={txLink} body={bodyContent} />
}
