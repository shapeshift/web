import { Button, Card, CardBody, CardFooter } from '@chakra-ui/react'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useHistory } from 'react-router'
import { ethereum } from 'test/mocks/assets'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'

import { StatusBody } from '../../StatusBody'
import { LimitOrderRoutePaths } from '../types'

const cardBorderRadius = { base: '2xl' }

const asset = ethereum

export const PlaceLimitOrder = () => {
  const history = useHistory()
  const [txStatus, setTxStatus] = useState(TxStatus.Pending)

  // Emulate tx executing for the vibes - does nothing other than spin for a sec and then show a
  // lovely green check
  useEffect(() => {
    setTimeout(() => setTxStatus(TxStatus.Confirmed), 1000)
  }, [setTxStatus])

  const handleSignAndBroadcast = useCallback(() => {
    switch (txStatus) {
      case TxStatus.Pending:
        setTxStatus(TxStatus.Confirmed)
        return
      case TxStatus.Confirmed:
        setTxStatus(TxStatus.Failed)
        return
      case TxStatus.Failed:
        setTxStatus(TxStatus.Unknown)
        return
      case TxStatus.Unknown:
      default:
        history.push(LimitOrderRoutePaths.Input)
        return
    }
  }, [history, txStatus])

  const handleGoBack = useCallback(() => {
    history.push(LimitOrderRoutePaths.Input)
  }, [history])

  const statusBody = useMemo(() => {
    if (!asset) return null
    const statusTranslation = (() => {
      switch (txStatus) {
        case TxStatus.Confirmed:
          return 'limitOrder.yourOrderHasBeenPlaced'
        case TxStatus.Failed:
        case TxStatus.Pending:
        case TxStatus.Unknown:
        default:
          return null
      }
    })()

    return (
      <StatusBody txStatus={txStatus}>
        <Text translation={statusTranslation} color='text.subtle' />
      </StatusBody>
    )
  }, [txStatus])

  return (
    <SlideTransition>
      <Card
        flex={1}
        borderRadius={cardBorderRadius}
        width='full'
        variant='dashboard'
        maxWidth='500px'
        borderColor='border.base'
        bg='background.surface.raised.base'
      >
        <CardBody py={32}>{statusBody}</CardBody>
        <CardFooter flexDir='row' gap={4} px={4} borderTopWidth={0}>
          <Button
            size='lg'
            width='full'
            onClick={handleGoBack}
            variant='ghost'
            aria-label='back'
            isLoading={false}
            isDisabled={txStatus === TxStatus.Pending}
          >
            <Text translation='common.goBack' />
          </Button>
          <Button
            colorScheme={'blue'}
            size='lg'
            width='full'
            onClick={handleSignAndBroadcast}
            isLoading={false}
            isDisabled={txStatus === TxStatus.Pending}
          >
            <Text translation='limitOrder.viewOrder' />
          </Button>
        </CardFooter>
      </Card>
    </SlideTransition>
  )
}
