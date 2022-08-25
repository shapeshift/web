import { List, ListProps } from '@chakra-ui/react'
import { forwardRef, useColorModeValue } from '@chakra-ui/system'

export const NestedList = forwardRef<ListProps, 'div'>((props, ref) => {
  const borderColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
  return <List px={4} ml={8} borderLeftWidth={1} borderColor={borderColor} ref={ref} {...props} />
})
