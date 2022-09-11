import type { FlexProps } from '@chakra-ui/react'
import { Flex } from '@chakra-ui/react'

export const DefiModalContent: React.FC<FlexProps> = ({ children, ...rest }) => {
  return (
    <Flex
      width='full'
      minWidth={{ base: '100%', md: '500px' }}
      maxWidth={{ base: '100%', md: '500px' }}
      flexDir='column'
      {...rest}
    >
      {children}
    </Flex>
  )
}
