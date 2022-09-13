import { mode } from '@chakra-ui/theme-tools'

export const AlertStyle = {
  parts: ['container', 'description'],
  // Styles for the base style
  baseStyle: {
    container: {
      borderRadius: 'lg',
    },
  },
  // Styles for the size variations
  sizes: {
    sm: {
      description: {
        fontSize: 'sm',
        lineHeight: 'normal',
      },
    },
  },
  // Styles for the visual style variations
  variants: {
    'update-box': (props: Record<string, any>) => ({
      container: {
        bg: mode('white', 'gray.700')(props),
        color: mode('black', 'white')(props),
        boxShadow: mode('md', 'dark-bg')(props),
      },
    }),
  },
  // The default `size` or `variant` values
  defaultProps: {},
}
