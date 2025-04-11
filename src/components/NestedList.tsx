import type { ListProps } from '@chakra-ui/react'
import { List } from '@chakra-ui/react'
import { forwardRef, useColorModeValue } from '@chakra-ui/system'

const listPaddingX = { base: 2, md: 4 }
const listMarginLeft = { base: 2, md: 8 }
const listBorderLeftWidth = { base: 0, md: 1 }

export const NestedList = forwardRef<ListProps, 'div'>((props, ref) => {
  const borderColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
  // Technically, <List /> supports many more props, but trying and spreading the whole props object will result in the tsc error below:
  // Expression produces a union type that is too complex to represent. [2590]
  // Since we only consume this component in two places, and pr is the only prop we need from `props`, destructuring it for sanity's sake.
  const pr = props.pr

  return (
    <List
      px={listPaddingX}
      ml={listMarginLeft}
      borderLeftWidth={listBorderLeftWidth}
      borderColor={borderColor}
      ref={ref}
      pr={pr}
    />
  )
})
