import { mode } from '@chakra-ui/theme-tools'
export const DrawerStyle = {
  parts: ['dialog'],
  // Styles for the base style
  baseStyle: (props: Record<string, any>) => ({
    dialog: {
      bg: mode('white', 'gray.785')(props)
    }
  }),
  // Styles for the size variations
  sizes: {},
  // Styles for the visual style variations
  variants: {},
  // The default `size` or `variant` values
  defaultProps: {}
}
