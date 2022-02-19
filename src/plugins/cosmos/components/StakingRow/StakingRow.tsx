import { Flex } from '@chakra-ui/layout'
import { AprTag } from 'plugins/cosmos/components/AprTag/AprTag'
import { Text } from 'components/Text'

export const StakingRow = () => (
  <Flex width='100%' mb='20px' justifyContent='space-between'>
    <Flex height='20px'>
      <Text translation={'defi.staked'} marginRight='20px' />
      <AprTag percentage='1.25' />
    </Flex>
    <Flex direction='column' alignItems='flex-end'>
      <Text translation={'$42,4242,42'} fontWeight='semibold' />
      <Text translation={'708.00 OSMO'} color='gray.500' />
    </Flex>
  </Flex>
)
