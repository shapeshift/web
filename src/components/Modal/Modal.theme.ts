import { mode } from '@chakra-ui/theme-tools'
export const ModalStyle = {
  parts: ['dialog'],
  // Styles for the base style
  baseStyle: (props: Record<string, any>) => ({
    dialog: {
      bg: mode('white', 'gray.785')(props),
      borderRadius: 'xl',
      borderColor: mode('gray.50', 'gray.750')(props),
      borderWidth: 1
    }
  }),
  // Styles for the size variations
  sizes: {},
  // Styles for the visual style variations
  variants: {},
  // The default `size` or `variant` values
  defaultProps: {}
}
