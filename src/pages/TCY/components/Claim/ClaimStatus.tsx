import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons'
import { ModalCloseButton, Stack } from '@chakra-ui/react'
import { SwapperName } from '@shapeshiftoss/swapper'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { InterpolationOptions } from 'node-polyglot'
import type { JSX } from 'react'
import React, { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { TCYClaimRoute } from '../../types'
import type { Claim } from './types'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { DialogHeader } from '@/components/Modal/components/DialogHeader'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { useSafeTxQuery } from '@/hooks/queries/useSafeTx'
import { useTxStatus } from '@/hooks/useTxStatus/useTxStatus'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { getTxLink } from '@/lib/getTxLink'
import { fromBaseUnit } from '@/lib/math'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type BodyContent = {
  key: TxStatus
  title: string | [string, InterpolationOptions]
  body: TextPropTypes['translation']
  element: JSX.Element
}

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
          'TCY.claimPending',
          {
            amount: bnOrZero(amountCryptoPrecision).toFixed(8),
            symbol: asset.symbol,
          },
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
          title: translate('pools.waitingForConfirmation'),
          body: [
            translate('TCY.claimStatus.pendingTitle'),
            {
              amount: bnOrZero(amountCryptoPrecision).toFixed(8),
              symbol: asset.symbol,
            },
          ],
          element: <CircularProgress size='75px' />,
        }
      case TxStatus.Confirmed:
        return {
          key: TxStatus.Confirmed,
          title: translate('common.success'),
          body: [
            'TCY.claimStatus.successTitle',
            {
              amount: bnOrZero(amountCryptoPrecision).toFixed(8),
              symbol: asset.symbol,
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
    asset,
    maybeSafeTx?.isQueuedSafeTx,
    maybeSafeTx?.isExecutedSafeTx,
    maybeSafeTx?.transaction?.confirmations?.length,
    maybeSafeTx?.transaction?.confirmationsRequired,
    maybeSafeTx?.transaction?.transactionHash,
    txStatus,
    amountCryptoPrecision,
    setClaimTxid,
    translate,
  ])

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

  const title = useMemo(() => {
    if (!bodyContent?.title) return ''
    if (typeof bodyContent.title === 'string') return bodyContent.title
    return translate(bodyContent.title[0], bodyContent.title[1])
  }, [bodyContent?.title, translate])

  const body = useMemo(() => {
    if (!bodyContent?.body) return ''
    if (typeof bodyContent.body === 'string') return bodyContent.body
    return translate(bodyContent.body[0], bodyContent.body[1])
  }, [bodyContent?.body, translate])

  return (
    <SlideTransition>
      <Stack>
        <DialogHeader>
          <DialogHeader.Middle>
            <RawText>{title}</RawText>
          </DialogHeader.Middle>
          <DialogHeader.Right>
            <ModalCloseButton onClick={handleGoBack} />
          </DialogHeader.Right>
        </DialogHeader>
        <Stack spacing={4} alignItems='center' py={8}>
          {bodyContent?.element}
          <RawText>{body}</RawText>
          {txLink && (
            <a href={txLink} target='_blank' rel='noopener noreferrer'>
              {translate('trade.viewTransaction')}
            </a>
          )}
        </Stack>
      </Stack>
    </SlideTransition>
  )
}
