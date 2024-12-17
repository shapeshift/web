import { Button, Card, CardBody, CardFooter, useMediaQuery } from '@chakra-ui/react'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useHistory } from 'react-router'
import { ethereum } from 'test/mocks/assets'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { breakpoints } from 'theme/theme'

import { StatusBody } from '../../StatusBody'
import { LimitOrderRoutePaths } from '../types'

const cardBorderRadius = { base: '2xl' }

const asset = ethereum

export const PlaceLimitOrder = ({ isCompact }: { isCompact?: boolean }) => {
  const history = useHistory()
  const [isSmallerThanXl] = useMediaQuery(`(max-width: ${breakpoints.xl})`, { ssr: false })
  const [txStatus, setTxStatus] = useState(TxStatus.Pending)

  // Emulate tx executing for the vibes - does nothing other than spin for a sec and then show a
  // lovely green check (placing orders is instant with cow because off-chain)
  useEffect(() => {
    setTimeout(() => setTxStatus(TxStatus.Confirmed), 1000)
  }, [setTxStatus])

  const handleViewOrdersList = useCallback(() => {
    // Route to order list explicitly on compact views, otherwise go back to input since it's got
    // the order list anyway
    if (isCompact || isSmallerThanXl) {
      history.push(LimitOrderRoutePaths.Orders)
    } else {
      history.push(LimitOrderRoutePaths.Input)
    }
  }, [history, isCompact, isSmallerThanXl])

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
        width='500px'
        variant='dashboard'
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
            onClick={handleViewOrdersList}
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
