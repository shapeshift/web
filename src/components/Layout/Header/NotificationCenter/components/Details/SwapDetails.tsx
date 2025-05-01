import { Avatar, Button, ButtonGroup, Progress, Stack } from '@chakra-ui/react'
import React from 'react'
import { useTranslate } from 'react-polyglot'

import { Row } from '@/components/Row/Row'
import { RawText } from '@/components/Text'

type SwapDetailsProps = {
  isStreaming?: boolean
}

export const SwapDetails: React.FC<SwapDetailsProps> = ({ isStreaming }) => {
  const translate = useTranslate()
  return (
    <Stack gap={4}>
      <Row fontSize='sm'>
        <Row.Label>{translate('notificationCenter.swap')}</Row.Label>
        <Row.Value>
          <RawText>0.00 SOL → 0.00 USDC</RawText>
        </Row.Value>
      </Row>
      <Row fontSize='sm'>
        <Row.Label>{translate('notificationCenter.protocol')}</Row.Label>
        <Row.Value display='flex' alignItems='center' gap={2}>
          <Avatar size='xs' />
          <RawText>0x</RawText>
        </Row.Value>
      </Row>
      {isStreaming && (
        <Row fontSize='sm'>
          <Row.Label>{translate('notificationCenter.streamingStatus')}</Row.Label>
          <Row.Value display='flex' alignItems='center' gap={2}>
            <Progress width='100px' size='xs' value={50} colorScheme='green' />
            <RawText>(2/5)</RawText>
          </Row.Value>
        </Row>
      )}
      <ButtonGroup width='full' size='sm'>
        <Button width='full'>{translate('notificationCenter.viewTransaction')}</Button>
      </ButtonGroup>
    </Stack>
  )
}
