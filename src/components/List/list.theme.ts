import { mode } from '@chakra-ui/theme-tools'

export const ListStyle = {
  parts: ['container', 'item', 'icon'],
  // Styles for the base style
  baseStyle: {},
  // Styles for the size variations
  sizes: {},
  // Styles for the visual style variations
  variants: {
    'rounded-divider': (props: Record<string, any>) => ({
      container: {
        borderRadius: 'lg',
        '> *': {
          borderBottomWidth: 1,
          borderColor: mode('gray.100', 'gray.750')(props),
        },
        '> :first-of-type': {
          borderTopRadius: 'lg',
          borderBottomRadius: 'none',
        },
        '> :last-child': {
          borderBottomRadius: 'lg',
          borderTopRadius: 'none',
          borderBottomWidth: 0,
        },
      },
    }),
    rounded: () => ({
      container: {
        borderRadius: 'lg',
        '> :first-of-type': {
          borderTopRadius: 'lg',
          borderBottomRadius: 'none',
        },
        '> :last-child': {
          borderBottomRadius: 'lg',
          borderTopRadius: 'none',
        },
      },
    }),
  },
  // The default `size` or `variant` values
  defaultProps: {},
}
