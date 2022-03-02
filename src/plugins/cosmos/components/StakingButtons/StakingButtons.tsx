import { Flex, FlexProps } from '@chakra-ui/layout'
import { Button } from '@chakra-ui/react'
import { Text } from 'components/Text'

export const StakingButtons = (styleProps?: FlexProps) => (
  <Flex
    justifyContent='space-between'
    flexWrap='wrap'
    height={{ base: '100px', sm: 'auto' }}
    width='100%'
    {...styleProps}
  >
    <Button width={{ base: '100%', sm: '180px' }}>
      <Text translation={'defi.stake'} fontWeight='bold' />
    </Button>
    <Button width={{ base: '100%', sm: '180px' }}>
      <Text translation={'defi.unstake'} fontWeight='bold' />
    </Button>
  </Flex>
)
