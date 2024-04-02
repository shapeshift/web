import type { FlexProps } from '@chakra-ui/react'
import { Flex } from '@chakra-ui/react'

export const DialogScroll: React.FC<FlexProps> = props => (
  <Flex flexDir='column' overflowY='auto' {...props} />
)
