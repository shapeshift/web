import { Flex } from '@chakra-ui/layout'
import { Text } from 'components/Text'

export const RewardsRow = () => (
  <Flex width='100%' mb='20px' mt='20px'>
    <Flex width='50%' height='20px'>
      <Text translation={'defi.rewards'} />
    </Flex>
    <Flex direction='column' alignItems='flex-end' width='100%'>
      <Text translation={'$42,4242,42'} fontWeight='semibold' color='green.500' />
      <Text translation={'708.00 OSMO'} color='gray.500' />
    </Flex>
  </Flex>
)
