import { Flex, FlexProps } from '@chakra-ui/layout'
import { Button } from '@chakra-ui/react'
import { Text } from 'components/Text'

export const StakingButtons = (styleProps?: FlexProps) => (
  <Flex
    justifyContent='space-between'
    flexWrap='wrap'
    height={{ base: '100px', sm: 'auto' }}
    {...styleProps}
  >
    <Button width={{ base: '100%', sm: '190px' }}>
      <Text translation={'defi.stake'} fontWeight='bold' color='white' />
    </Button>
    <Button width={{ base: '100%', sm: '190px' }}>
      <Text translation={'defi.unstake'} fontWeight='bold' color='white' />
    </Button>
  </Flex>
)
