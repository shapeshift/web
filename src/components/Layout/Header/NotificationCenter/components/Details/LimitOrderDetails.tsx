import { Button, ButtonGroup, Progress, Stack } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import { Row } from '@/components/Row/Row'
import { RawText } from '@/components/Text'

export const LimitOrderDetails = () => {
  const translate = useTranslate()

  return (
    <Stack gap={4}>
      <Row fontSize='sm'>
        <Row.Label>{translate('notificationCenter.pair')}</Row.Label>
        <Row.Value>
          <RawText>ETH/USDC</RawText>
        </Row.Value>
      </Row>
      <Row fontSize='sm'>
        <Row.Label>{translate('notificationCenter.limitPrice')}</Row.Label>
        <Row.Value>
          <RawText>1 ETH = 0.00 USDC</RawText>
        </Row.Value>
      </Row>
      <Row fontSize='sm'>
        <Row.Label>{translate('notificationCenter.expires')}</Row.Label>
        <Row.Value>
          <RawText>10 minutes</RawText>
        </Row.Value>
      </Row>
      <Row fontSize='sm'>
        <Row.Label>{translate('notificationCenter.executionPrice')}</Row.Label>
        <Row.Value>
          <RawText>1 ETH = 0.00 USDC</RawText>
        </Row.Value>
      </Row>
      <Row fontSize='sm'>
        <Row.Label>{translate('notificationCenter.filled')}</Row.Label>
        <Row.Value display='flex' alignItems='center' gap={2}>
          <Progress width='100px' size='xs' value={50} colorScheme='green' />
          <RawText>50%</RawText>
        </Row.Value>
      </Row>
      <ButtonGroup width='full' size='sm'>
        <Button width='full'>{translate('notificationCenter.viewOrder')}</Button>
        <Button width='full'>{translate('notificationCenter.cancelOrder')}</Button>
      </ButtonGroup>
    </Stack>
  )
}
