import type { StyleFunctionProps } from '@chakra-ui/theme-tools'
import { mode } from '@chakra-ui/theme-tools'

export const StackDividerStyle = {
  // Styles for the base style
  baseStyle: (props: StyleFunctionProps) => ({
    borderColor: mode('gray.100', 'gray.750')(props),
  }),
  // Styles for the size variations
  sizes: {},
  // Styles for the visual style variations
  variants: {},
  // The default `size` or `variant` values
  defaultProps: {},
}
