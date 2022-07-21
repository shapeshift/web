import { mode } from '@chakra-ui/theme-tools'
export const TableStyle = {
  parts: ['table', 'tr', 'tbody', 'td', 'thead', 'th'],
  // Styles for the base style
  baseStyle: {
    thead: {
      tr: {
        th: {
          paddingLeft: 4,
          paddingRight: 4,
        },
      },
    },
    tbody: {
      tr: {
        td: {
          paddingLeft: 4,
          paddingRight: 4,
        },
      },
    },
  },
  // Styles for the size variations
  sizes: {},
  // Styles for the visual style variations
  variants: {
    clickable: (props: Record<string, any>) => {
      return {
        tbody: {
          tr: {
            borderRadius: 'lg',
            _focus: {
              boxShadow: 'outline-inset',
            },
            _disabled: {
              opacity: 0.4,
              cursor: 'not-allowed',
              boxShadow: 'none',
              pointerEvents: 'none',
            },
            _hover: {
              color: mode('inherit', 'whiteAlpha.800')(props),
              bg: mode('gray.100', 'gray.750')(props),
              textDecoration: 'none',
              _disabled: {
                bg: 'initial',
              },
            },
            color: 'gray.500',
            _active: {
              bg: mode('gray.200', 'gray.700')(props),
              color: mode('gray.800', 'white')(props),
            },
            _checked: {
              bg: mode('gray.200', 'gray.700')(props),
            },
            'td:first-of-type': {
              borderLeftRadius: 'lg',
            },
            'td:last-of-type': {
              borderRightRadius: 'lg',
            },
          },
        },
      }
    },
  },
  // The default `size` or `variant` values
  defaultProps: {},
}
