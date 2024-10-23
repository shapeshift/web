import { Button, Card, CardBody, CardFooter } from '@chakra-ui/react'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { ethereum } from 'test/mocks/assets'
import { Amount } from 'components/Amount/Amount'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'

import { StatusBody } from '../../StatusBody'
import { LimitOrderRoutePaths } from '../types'

const cardBorderRadius = { base: 'xl' }

const asset = ethereum

export const LimitOrderStatus = () => {
  const history = useHistory()
  const translate = useTranslate()
  const [txStatus, setTxStatus] = useState(TxStatus.Pending)

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

  const amountCryptoPrecision = '0.12420'

  const statusBody = useMemo(() => {
    if (!asset) return null
    const renderedAmount = (() => {
      switch (txStatus) {
        case TxStatus.Pending: {
          return (
            <Amount.Crypto
              prefix={translate('bridge.claimPending')}
              value={amountCryptoPrecision}
              symbol={asset.symbol}
              color='text.subtle'
            />
          )
        }
        case TxStatus.Confirmed: {
          return (
            <Amount.Crypto
              prefix={translate('bridge.claimSuccess')}
              value={amountCryptoPrecision}
              symbol={asset.symbol}
              color='text.subtle'
            />
          )
        }
        case TxStatus.Failed: {
          return (
            <Amount.Crypto
              prefix={translate('bridge.claimFailed')}
              value={amountCryptoPrecision}
              symbol={asset.symbol}
              color='text.subtle'
            />
          )
        }
        case TxStatus.Unknown:
        default:
          return null
      }
    })()

    return <StatusBody txStatus={txStatus}>{renderedAmount}</StatusBody>
  }, [amountCryptoPrecision, translate, txStatus])

  return (
    <SlideTransition>
      <Card
        flex={1}
        borderRadius={cardBorderRadius}
        width='full'
        variant='dashboard'
        maxWidth='500px'
      >
        <CardBody py={32}>{statusBody}</CardBody>
        <CardFooter
          flexDir='column'
          gap={2}
          px={4}
          borderTopWidth={1}
          borderColor='border.base'
          bg='background.surface.raised.base'
          borderBottomRadius='md'
        >
          <Button
            colorScheme={'blue'}
            size='lg'
            width='full'
            onClick={handleSignAndBroadcast}
            isLoading={false}
          >
            <Text translation={'limitOrder.signTransaction'} />
          </Button>
        </CardFooter>
      </Card>
    </SlideTransition>
  )
}
