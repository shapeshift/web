import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons'
import { Button, CardBody, CardFooter, Center, Heading, Stack } from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { AnimatePresence } from 'framer-motion'
import React, { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { SlideTransition } from 'components/SlideTransition'
import { SlideTransitionY } from 'components/SlideTransitionY'
import { Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { fromBaseUnit } from 'lib/math'
import { selectAssetById, selectTxById } from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

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
}

export const UnstakeStatus: React.FC<UnstakeRouteProps & UnstakeStatusProps> = ({
  confirmedQuote,
  txId,
}) => {
  const history = useHistory()
  const translate = useTranslate()

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
            { amount: unstakingAmountCryptoPrecision, symbol: stakingAsset.symbol },
          ],
          element: <CircularProgress size='75px' />,
        }
      case TxStatus.Confirmed:
        return {
          key: TxStatus.Confirmed,
          title: 'common.success',
          body: [
            'RFOX.unstakeSuccess',
            // TODO(gomes): store cooldownPeriod in confirmed quote
            {
              amount: unstakingAmountCryptoPrecision,
              symbol: stakingAsset.symbol,
              cooldownPeriod: '28 days',
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
  }, [stakingAsset, tx?.status, unstakingAmountCryptoPrecision])

  return (
    <SlideTransition>
      {bodyContent && (
        <AnimatePresence mode='wait'>
          <SlideTransitionY key={bodyContent.key}>
            <CardBody py={12}>
              <Center flexDir='column' gap={4}>
                {bodyContent.element}
                <Stack spacing={0} alignItems='center'>
                  <Heading as='h4'>{translate(bodyContent.title)}</Heading>
                  <Text translation={bodyContent.body} textAlign='center' />
                </Stack>
              </Center>
            </CardBody>
          </SlideTransitionY>
        </AnimatePresence>
      )}
      <CardFooter flexDir='column' gap={2}>
        <Button size='lg' variant='ghost'>
          {translate('trade.viewTransaction')}
        </Button>
        <Button size='lg' colorScheme='blue' onClick={handleGoBack}>
          {translate('common.goBack')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
