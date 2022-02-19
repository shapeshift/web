import { Flex } from '@chakra-ui/layout'
import { Button } from '@chakra-ui/react'
import { Text } from 'components/Text'

export const StakingButtons = () => (
  <Flex justifyContent='space-between' width='100%'>
    <Button width='190px'>
      <Text translation={'defi.stake'} fontWeight='bold' color='white' />
    </Button>
    <Button width='190px'>
      <Text translation={'defi.unstake'} fontWeight='bold' color='white' />
    </Button>
  </Flex>
)
