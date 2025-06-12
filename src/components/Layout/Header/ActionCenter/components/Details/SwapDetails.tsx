import { Button, ButtonGroup, Link, Progress, Stack } from '@chakra-ui/react'
import React from 'react'
import { useTranslate } from 'react-polyglot'

import { Row } from '@/components/Row/Row'
import { RawText } from '@/components/Text'

type SwapDetailsProps = {
  isStreaming?: boolean
  txLink?: string
}

export const SwapDetails: React.FC<SwapDetailsProps> = ({ isStreaming, txLink }) => {
  const translate = useTranslate()

  return (
    <Stack gap={4}>
      {isStreaming && (
        <Row fontSize='sm'>
          <Row.Label>{translate('notificationCenter.streamingStatus')}</Row.Label>
          <Row.Value display='flex' alignItems='center' gap={2}>
            <Progress width='100px' size='xs' value={50} colorScheme='green' />
            <RawText>(2/5)</RawText>
          </Row.Value>
        </Row>
      )}
      {txLink && (
        <ButtonGroup width='full' size='sm'>
          <Button width='full' as={Link} isExternal href={txLink}>
            {translate('notificationCenter.viewTransaction')}
          </Button>
        </ButtonGroup>
      )}
    </Stack>
  )
}
