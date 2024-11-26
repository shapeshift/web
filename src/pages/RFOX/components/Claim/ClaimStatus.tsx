import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons'
import type { AccountId } from '@shapeshiftoss/caip'
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
import type { ClaimRoutePaths, type ClaimRouteProps, RfoxClaimQuote } from './types'

type BodyContent = {
  key: TxStatus
  title: string | [string, InterpolationOptions]
  body: TextPropTypes['translation']
  element: JSX.Element
}

type ClaimStatusProps = {
  confirmedQuote: RfoxClaimQuote
  accountId: AccountId
  txId: string
  setClaimTxid: (txId: string) => void
  onTxConfirmed: () => Promise<void>
}

export const ClaimStatus: React.FC<Pick<ClaimRouteProps, 'headerComponent'> & ClaimStatusProps> = ({
  confirmedQuote,
  accountId,
  txId,
  setClaimTxid,
  onTxConfirmed: handleTxConfirmed,
}) => {
  const history = useHistory()

  const handleGoBack = useCallback(() => {
    history.push(ClaimRoutePaths.Select)
  }, [history])

  const claimAsset = useAppSelector(state => selectAssetById(state, confirmedQuote.stakingAssetId))
  const claimAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(confirmedQuote.stakingAmountCryptoBaseUnit, claimAsset?.precision ?? 0),
    [confirmedQuote.stakingAmountCryptoBaseUnit, claimAsset?.precision],
  )

  const txStatus = useTxStatus({
    accountId: confirmedQuote.stakingAssetAccountId,
    txHash: txId,
    onTxStatusConfirmed: handleTxConfirmed,
  })

  const { data: maybeSafeTx } = useSafeTxQuery({
    maybeSafeTxHash: txId ?? undefined,
    accountId: confirmedQuote.stakingAssetAccountId,
  })

  const bodyContent: BodyContent | null = useMemo(() => {
    if (!claimAsset) return null

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
          'RFOX.claimPending',
          { amount: bnOrZero(claimAmountCryptoPrecision).toFixed(8), symbol: claimAsset.symbol },
        ],
        element: <CircularProgress size='75px' />,
      }
    }

    if (maybeSafeTx?.isExecutedSafeTx && maybeSafeTx?.transaction?.transactionHash) {
      setClaimTxid(maybeSafeTx.transaction.transactionHash)
    }

    switch (txStatus) {
      case undefined:
      case TxStatus.Pending:
        return {
          key: TxStatus.Pending,
          title: 'pools.waitingForConfirmation',
          body: [
            'RFOX.claimPending',
            { amount: bnOrZero(claimAmountCryptoPrecision).toFixed(8), symbol: claimAsset.symbol },
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
              amount: bnOrZero(claimAmountCryptoPrecision).toFixed(8),
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
  }, [
    claimAsset,
    maybeSafeTx?.isQueuedSafeTx,
    maybeSafeTx?.isExecutedSafeTx,
    maybeSafeTx?.transaction?.confirmations?.length,
    maybeSafeTx?.transaction?.confirmationsRequired,
    maybeSafeTx?.transaction?.transactionHash,
    txStatus,
    claimAmountCryptoPrecision,
    setClaimTxid,
  ])

  const txLink = useMemo(
    () =>
      getTxLink({
        txId,
        defaultExplorerBaseUrl: claimAsset?.explorerTxLink ?? '',
        accountId,
        maybeSafeTx,
      }),
    [accountId, claimAsset?.explorerTxLink, maybeSafeTx, txId],
  )

  return <SharedStatus onBack={handleGoBack} txLink={txLink} body={bodyContent} />
}
