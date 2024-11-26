import { Button, Card, CardBody, CardFooter, Link } from '@chakra-ui/react'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
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
  const translate = useTranslate()
  const [txStatus, setTxStatus] = useState(TxStatus.Pending)

  // emulate tx executing
  useEffect(() => {
    setTimeout(() => setTxStatus(TxStatus.Confirmed), 3000)
  }, [setTxStatus])

  const statusBody = useMemo(() => {
    if (!asset) return null
    const statusTranslation = (() => {
      switch (txStatus) {
        case TxStatus.Confirmed:
          return 'limitOrder.yourCancellationHasBeenSubmitted'
        case TxStatus.Failed:
        case TxStatus.Pending:
        case TxStatus.Unknown:
        default:
          return null
      }
    })()

    // TODO: get the actual tx link
    const txLink = 'todo'

    return (
      <StatusBody txStatus={txStatus}>
        <>
          <Text translation={statusTranslation} color='text.subtle' />
          {Boolean(txLink) && (
            <Button as={Link} href={txLink} size='sm' variant='link' colorScheme='blue' isExternal>
              {translate('limitOrder.viewOnChain')}
            </Button>
          )}
        </>
      </StatusBody>
    )
  }, [translate, txStatus])

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
      </Card>
    </SlideTransition>
  )
}
