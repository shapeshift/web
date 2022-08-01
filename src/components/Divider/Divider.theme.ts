import { mode } from '@chakra-ui/theme-tools'
export const DividerStyle = {
  // Styles for the base style
  baseStyle: (props: Record<string, any>) => ({
    borderColor: mode('gray.100', 'whiteAlpha.100')(props),
  }),
  // Styles for the size variations
  sizes: {},
  // Styles for the visual style variations
  variants: {},
  // The default `size` or `variant` values
  defaultProps: {},
}
