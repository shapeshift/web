import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons'
import type { AccountId } from '@shapeshiftoss/caip'
import { foxWifHatAssetId, fromAccountId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { InterpolationOptions } from 'node-polyglot'
import React, { useMemo } from 'react'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import type { TextPropTypes } from 'components/Text/Text'
import { useSafeTxQuery } from 'hooks/queries/useSafeTx'
import { useTxStatus } from 'hooks/useTxStatus/useTxStatus'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { getTxLink } from 'lib/getTxLink'
import { fromBaseUnit } from 'lib/math'
import { useFoxWifHatMerkleTreeQuery } from 'pages/Fox/hooks/useFoxWifHatMerkleTreeQuery'
import { SharedStatus } from 'pages/RFOX/components/Shared/SharedStatus'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type BodyContent = {
  key: TxStatus
  title: string | [string, InterpolationOptions]
  body: TextPropTypes['translation']
  element: JSX.Element
}

type FoxWifHatClaimStatusProps = {
  accountId: AccountId
  txId: string
  setClaimTxid: (txId: string) => void
  onTxConfirmed: () => Promise<void>
}

export const FoxWifHatClaimStatus: React.FC<FoxWifHatClaimStatusProps> = ({
  accountId,
  txId,
  setClaimTxid,
  onTxConfirmed: handleTxConfirmed,
}) => {
  const getFoxWifHatClaimsQuery = useFoxWifHatMerkleTreeQuery()

  const claimQuote = useMemo(() => {
    const claim = getFoxWifHatClaimsQuery.data?.claims[fromAccountId(accountId).account]
    if (!claim) return null

    return claim
  }, [getFoxWifHatClaimsQuery.data, accountId])

  const claimAsset = useAppSelector(state => selectAssetById(state, foxWifHatAssetId))
  const claimAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(claimQuote?.amount ?? '0', claimAsset?.precision ?? 0),
    [claimQuote?.amount, claimAsset?.precision],
  )

  const txStatus = useTxStatus({
    accountId,
    txHash: txId,
    onTxStatusConfirmed: handleTxConfirmed,
  })

  const { data: maybeSafeTx } = useSafeTxQuery({
    maybeSafeTxHash: txId ?? undefined,
    accountId,
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

  return <SharedStatus txLink={txLink} body={bodyContent} />
}
