import { Button, CardBody, CardFooter, Link } from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { AnimatePresence } from 'framer-motion'
import React, { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import type { ClaimDetails } from './hooks/useArbitrumClaimsByStatus'
import { ClaimRoutePaths } from './types'

import { Amount } from '@/components/Amount/Amount'
import { StatusBody } from '@/components/MultiHopTrade/components/StatusBody'
import { SlideTransition } from '@/components/SlideTransition'
import { useSafeTxQuery } from '@/hooks/queries/useSafeTx'
import { getTxLink } from '@/lib/getTxLink'
import { fromBaseUnit } from '@/lib/math'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type ClaimStatusProps = {
  activeClaim: ClaimDetails
  claimTxHash: string
  claimTxStatus: TxStatus
}

export const ClaimStatus: React.FC<ClaimStatusProps> = ({
  activeClaim,
  claimTxHash,
  claimTxStatus,
}) => {
  const navigate = useNavigate()
  const translate = useTranslate()

  const handleGoBack = useCallback(() => {
    navigate(ClaimRoutePaths.Select)
  }, [navigate])

  const asset = useAppSelector(state => selectAssetById(state, activeClaim.assetId))

  const amountCryptoPrecision = useMemo(() => {
    return fromBaseUnit(activeClaim.amountCryptoBaseUnit, asset?.precision ?? 0)
  }, [asset, activeClaim])

  const statusBody = useMemo(() => {
    if (!asset) return null
    const prefix = (() => {
      switch (claimTxStatus) {
        case TxStatus.Pending:
          return translate('bridge.claimPending')
        case TxStatus.Confirmed:
          return translate('bridge.claimSuccess')
        case TxStatus.Failed:
          return translate('bridge.claimFailed')
        case TxStatus.Unknown:
        default:
          return null
      }
    })()

    return (
      <StatusBody txStatus={claimTxStatus}>
        <Amount.Crypto
          prefix={prefix ?? ''}
          value={amountCryptoPrecision}
          symbol={asset.symbol}
          color='text.subtle'
        />
      </StatusBody>
    )
  }, [amountCryptoPrecision, asset, translate, claimTxStatus])

  const { data: maybeSafeTx } = useSafeTxQuery({
    maybeSafeTxHash: claimTxHash,
    accountId: activeClaim.accountId,
  })

  const txLink = useMemo(() => {
    return getTxLink({
      txId: claimTxHash,
      defaultExplorerBaseUrl: activeClaim.destinationExplorerTxLink,
      maybeSafeTx,
      address: fromAccountId(activeClaim.accountId).account,
      chainId: fromAccountId(activeClaim.accountId).chainId,
    })
  }, [activeClaim.accountId, activeClaim.destinationExplorerTxLink, claimTxHash, maybeSafeTx])

  return (
    <SlideTransition>
      <AnimatePresence mode='wait'>
        <CardBody py={32}>{statusBody}</CardBody>
      </AnimatePresence>
      <CardFooter flexDir='column' gap={2}>
        <Button as={Link} href={txLink} size='lg' colorScheme='blue' variant='ghost' isExternal>
          {translate('trade.viewTransaction')}
        </Button>
        <Button size='lg' colorScheme='blue' onClick={handleGoBack}>
          {translate('common.goBack')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
