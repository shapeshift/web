import type { ListProps } from '@chakra-ui/react'
import { forwardRef, List, useColorModeValue } from '@chakra-ui/react'

const listPaddingX = { base: 2, md: 4 }
const listMarginLeft = { base: 2, md: 8 }
const listBorderLeftWidth = { base: 0, md: 1 }

export const NestedList = forwardRef<ListProps, 'div'>((props, ref) => {
  const borderColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
  return (
    <List
      ml={listMarginLeft}
      pl={listPaddingX}
      pr={listPaddingX}
      borderLeftWidth={listBorderLeftWidth}
      borderColor={borderColor}
      ref={ref}
      {...props}
    />
  )
})
