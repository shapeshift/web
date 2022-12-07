import { mode } from '@chakra-ui/theme-tools'
export const TableStyle = {
  parts: ['table', 'tr', 'tbody', 'td', 'thead', 'th'],
  // Styles for the base style
  baseStyle: {},
  // Styles for the size variations
  sizes: {
    md: {
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
    sm: {
      thead: {
        tr: {
          th: {
            paddingLeft: 2,
            paddingRight: 2,
            paddingTop: 4,
            paddingBottom: 4,
          },
        },
      },
      tbody: {
        tr: {
          td: {
            paddingLeft: 2,
            paddingRight: 2,
            paddingTop: 4,
            paddingBottom: 4,
          },
        },
      },
    },
  },
  // Styles for the visual style variations
  variants: {
    clickable: (props: Record<string, any>) => {
      return {
        tbody: {
          tr: {
            borderRadius: 'xl',
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
              borderLeftRadius: 'xl',
            },
            'td:last-of-type': {
              borderRightRadius: 'xl',
            },
          },
        },
      }
    },
  },
  // The default `size` or `variant` values
  defaultProps: {
    size: 'md',
  },
}
