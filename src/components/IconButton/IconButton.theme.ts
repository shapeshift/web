import { mode } from '@chakra-ui/theme-tools'

export const IconButtonStyle = {
  // style object for base or default style
  baseStyle: (props: Record<string, any>) => ({
    bg: mode('blue.50', 'gray.900')(props)
  }),
  // styles for different sizes ("sm", "md", "lg")
  sizes: {},
  // styles for different visual variants ("outline", "solid")
  variants: {},
  // default values for `size` and `variant`
  defaultProps: {}
}
