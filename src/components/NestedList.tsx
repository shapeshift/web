import type { ListProps } from '@chakra-ui/react'
import { List } from '@chakra-ui/react'
import { forwardRef, useColorModeValue } from '@chakra-ui/system'

const listPaddingX = { base: 2, md: 4 }
const listMarginLeft = { base: 2, md: 8 }
const listBorderLeftWidth = { base: 0, md: 1 }

export const NestedList = forwardRef<ListProps, 'div'>((props, ref) => {
  const borderColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
  return (
    <List
      px={listPaddingX}
      ml={listMarginLeft}
      borderLeftWidth={listBorderLeftWidth}
      borderColor={borderColor}
      ref={ref}
      {...props}
    />
  )
})
