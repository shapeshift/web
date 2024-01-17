import { Button, ButtonGroup, Flex, Stack } from '@chakra-ui/react'

export const PoolChart = () => {
  return (
    <Stack>
      <Flex justifyContent='space-between'>
        <ButtonGroup size='sm'>
          <Button>Volume</Button>
          <Button>Liquidity</Button>
        </ButtonGroup>
        <ButtonGroup size='sm'>
          <Button>1M</Button>
          <Button>1W</Button>
          <Button>All</Button>
        </ButtonGroup>
      </Flex>
    </Stack>
  )
}
