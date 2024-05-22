import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons'
import { Button, CardBody, CardFooter, Center, Heading, Stack } from '@chakra-ui/react'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { AnimatePresence } from 'framer-motion'
import { type FC, useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { SlideTransition } from 'components/SlideTransition'
import { SlideTransitionY } from 'components/SlideTransitionY'
import { Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'

type BodyContent = {
  key: TxStatus
  title: string
  body: TextPropTypes['translation']
  element: JSX.Element
}

type StatusProps = {
  headerComponent?: JSX.Element
  onBack: () => void
  pendingBody: TextPropTypes['translation']
  confirmedBody: TextPropTypes['translation']
}

export const Status: FC<StatusProps> = ({ onBack }) => {
  const [status, setStatus] = useState<TxStatus>(TxStatus.Pending)
  const translate = useTranslate()

  const handleFakeStatus = useCallback(() => {
    setStatus(TxStatus.Confirmed)
  }, [])

  const bodyContent: BodyContent | null = useMemo(() => {
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
      {bodyContent && (
        <AnimatePresence mode='wait'>
          <SlideTransitionY key={bodyContent.key}>
            <CardBody py={12} onClick={handleFakeStatus}>
              <Center flexDir='column' gap={4}>
                {bodyContent.element}
                <Stack spacing={0} alignItems='center'>
                  <Heading as='h4'>{translate(bodyContent.title)}</Heading>
                  <Text translation={bodyContent.body} />
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
        <Button size='lg' colorScheme='blue' onClick={onBack}>
          {translate('common.goBack')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
