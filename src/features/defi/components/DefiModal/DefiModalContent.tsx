import type { FlexProps } from '@chakra-ui/react'
import { Flex } from '@chakra-ui/react'

const flexMinWidth = { base: '100%', md: '500px' }
const flexMaxWidth = { base: '100%', md: '500px' }

export const DefiModalContent: React.FC<FlexProps> = ({ children, ...rest }) => {
  'use no memo'
  return (
    <Flex width='full' minWidth={flexMinWidth} maxWidth={flexMaxWidth} flexDir='column' {...rest}>
      {children}
    </Flex>
  )
}
