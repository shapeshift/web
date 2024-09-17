import { CheckCircleIcon, WarningTwoIcon } from '@chakra-ui/icons'
import { Button, CardBody, CardFooter, Center, Heading, Link, Stack } from '@chakra-ui/react'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { AnimatePresence } from 'framer-motion'
import React, { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { SlideTransition } from 'components/SlideTransition'
import { SlideTransitionY } from 'components/SlideTransitionY'
import { useSafeTxQuery } from 'hooks/queries/useSafeTx'
import { getTxLink } from 'lib/getTxLink'
import { fromBaseUnit } from 'lib/math'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { ClaimDetails } from './hooks/useArbitrumClaimsByStatus'
import { ClaimRoutePaths } from './types'

type ClaimStatusBodyProps = {
  amountCryptoPrecision: string
  description: string
  icon: JSX.Element
  status: TxStatus
  symbol: string
  title: string
}

export const ClaimStatusBody: React.FC<ClaimStatusBodyProps> = ({
  amountCryptoPrecision,
  description,
  icon,
  status,
  symbol,
  title,
}) => {
  return (
    <SlideTransitionY key={status}>
      <CardBody py={32}>
        <Center flexDir='column' gap={4}>
          {icon}
          <Stack spacing={2} alignItems='center'>
            <Heading as='h4'>{title}</Heading>
            <Amount.Crypto
              prefix={description}
              value={amountCryptoPrecision}
              symbol={symbol}
              color='text.subtle'
            />
          </Stack>
        </Center>
      </CardBody>
    </SlideTransitionY>
  )
}

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
  const history = useHistory()
  const translate = useTranslate()

  const handleGoBack = useCallback(() => {
    history.push(ClaimRoutePaths.Select)
  }, [history])

  const asset = useAppSelector(state => selectAssetById(state, activeClaim.assetId))

  const amountCryptoPrecision = useMemo(() => {
    return fromBaseUnit(activeClaim.amountCryptoBaseUnit, asset?.precision ?? 0)
  }, [asset, activeClaim])

  const StatusBody = useMemo(() => {
    if (!asset) return null

    switch (claimTxStatus) {
      case TxStatus.Pending: {
        return (
          <ClaimStatusBody
            amountCryptoPrecision={amountCryptoPrecision}
            description={translate('bridge.claimPending')}
            // eslint-disable-next-line react-memo/require-usememo
            icon={<CircularProgress size='24' />}
            status={TxStatus.Pending}
            symbol={asset.symbol}
            title={translate('pools.waitingForConfirmation')}
          />
        )
      }
      case TxStatus.Confirmed: {
        return (
          <ClaimStatusBody
            amountCryptoPrecision={amountCryptoPrecision}
            description={translate('bridge.claimSuccess')}
            // eslint-disable-next-line react-memo/require-usememo
            icon={<CheckCircleIcon color='text.success' boxSize='24' />}
            status={TxStatus.Confirmed}
            symbol={asset.symbol}
            title={translate('common.success')}
          />
        )
      }
      case TxStatus.Failed: {
        return (
          <ClaimStatusBody
            amountCryptoPrecision={amountCryptoPrecision}
            description={translate('bridge.claimFailed')}
            // eslint-disable-next-line react-memo/require-usememo
            icon={<WarningTwoIcon color='red.500' boxSize='24' />}
            status={TxStatus.Failed}
            symbol={asset.symbol}
            title={translate('common.somethingWentWrong')}
          />
        )
      }
      case TxStatus.Unknown:
      default:
        return null
    }
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
      accountId: activeClaim.accountId,
    })
  }, [activeClaim.accountId, activeClaim.destinationExplorerTxLink, claimTxHash, maybeSafeTx])

  return (
    <SlideTransition>
      <AnimatePresence mode='wait'>{StatusBody}</AnimatePresence>
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
