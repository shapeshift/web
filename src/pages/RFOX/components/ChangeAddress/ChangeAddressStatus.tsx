import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons'
import { Button, CardBody, CardFooter, Center, Heading, Link, Stack } from '@chakra-ui/react'
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
import { getTxLink } from 'lib/getTxLink'
import { selectAssetById, selectTxById } from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

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
  const translate = useTranslate()

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
                  <Text translation={bodyContent.body} textAlign='center' mt={2} />
                </Stack>
              </Center>
            </CardBody>
          </SlideTransitionY>
        </AnimatePresence>
      )}
      <CardFooter flexDir='column' gap={2}>
        <Button as={Link} href={txLink} size='lg' variant='ghost' isExternal>
          {translate('trade.viewTransaction')}
        </Button>
        <Button size='lg' colorScheme='blue' onClick={handleGoBack}>
          {translate('common.goBack')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
