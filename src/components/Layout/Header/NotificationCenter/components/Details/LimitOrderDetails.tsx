import { Button, ButtonGroup, Progress, Stack } from '@chakra-ui/react'

import { Row } from '@/components/Row/Row'
import { RawText } from '@/components/Text'

export const LimitOrderDetails = () => {
  return (
    <Stack gap={4}>
      <Row fontSize='sm'>
        <Row.Label>Pair</Row.Label>
        <Row.Value>
          <RawText>ETH/USDC</RawText>
        </Row.Value>
      </Row>
      <Row fontSize='sm'>
        <Row.Label>Limit Price</Row.Label>
        <Row.Value>
          <RawText>1 ETH = 0.00 USDC</RawText>
        </Row.Value>
      </Row>
      <Row fontSize='sm'>
        <Row.Label>Expires</Row.Label>
        <Row.Value>
          <RawText>10 minutes</RawText>
        </Row.Value>
      </Row>
      <Row fontSize='sm'>
        <Row.Label>Execution Price</Row.Label>
        <Row.Value>
          <RawText>1 ETH = 0.00 USDC</RawText>
        </Row.Value>
      </Row>
      <Row fontSize='sm'>
        <Row.Label>Filled</Row.Label>
        <Row.Value display='flex' alignItems='center' gap={2}>
          <Progress width='100px' size='xs' value={50} colorScheme='green' />
          <RawText>50%</RawText>
        </Row.Value>
      </Row>
      <ButtonGroup width='full' size='sm'>
        <Button width='full'>View Order</Button>
        <Button width='full'>Cancel Order</Button>
      </ButtonGroup>
    </Stack>
  )
}
