import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons'
import { Button, CardBody, CardFooter, Center, Heading, Stack } from '@chakra-ui/react'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { AnimatePresence } from 'framer-motion'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { SlideTransition } from 'components/SlideTransition'
import { SlideTransitionY } from 'components/SlideTransitionY'
import { Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'

import { StakeRoutePaths, type StakeRouteProps } from './types'

type RenderBody = {
  key: TxStatus
  title: string
  body: TextPropTypes['translation']
  element: JSX.Element
}

export const StakeStatus: React.FC<StakeRouteProps> = () => {
  const [status, setStatus] = useState<TxStatus>(TxStatus.Pending)
  const history = useHistory()
  const translate = useTranslate()

  const handleGoBack = useCallback(() => {
    history.push(StakeRoutePaths.Input)
  }, [history])

  const handleFakeStatus = useCallback(() => {
    setStatus(TxStatus.Confirmed)
  }, [])

  const renderBody: RenderBody | null = useMemo(() => {
    switch (status) {
      case TxStatus.Pending:
        return {
          key: TxStatus.Pending,
          title: 'pools.waitingForConfirmation',
          body: ['RFOX.stakePending', { amount: '1,500', symbol: 'FOX' }],
          element: <CircularProgress size='75px' />,
        }
      case TxStatus.Confirmed:
        return {
          key: TxStatus.Confirmed,
          title: 'common.success',
          body: ['RFOX.stakeSuccess', { amount: '1,500', symbol: 'FOX' }],
          element: <CheckCircleIcon color='text.success' boxSize='75px' />,
        }
      case TxStatus.Failed:
        return {
          key: TxStatus.Failed,
          title: 'common.somethingWentWrong',
          body: 'Show error message here',
          element: <WarningIcon color='text.error' boxSize='75px' />,
        }
      default:
        return null
    }
  }, [status])

  return (
    <SlideTransition>
      {renderBody && (
        <AnimatePresence mode='wait'>
          <SlideTransitionY key={renderBody.key}>
            <CardBody py={12} onClick={handleFakeStatus}>
              <Center flexDir='column' gap={4}>
                {renderBody.element}
                <Stack spacing={0} alignItems='center'>
                  <Heading as='h4'>{translate(renderBody.title)}</Heading>
                  <Text translation={renderBody.body} />
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
