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
      tfoot: {
        tr: {
          td: {
            paddingTop: 2,
            paddingBottom: 2,
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
    default: (props: Record<string, any>) => {
      return {
        table: {
          '> :last-child tr:last-of-type td:first-of-type': {
            borderBottomLeftRadius: 'xl',
          },
          '> :last-child tr:last-of-type td:last-of-type': {
            borderBottomRightRadius: 'xl',
          },
        },
        thead: {
          tr: {
            bg: mode('gray.100', 'gray.785')(props),
            'th:first-of-type': {
              borderTopLeftRadius: 'xl',
            },
            'th:last-of-type': {
              borderTopRightRadius: 'xl',
            },
          },
        },
        tbody: {
          tr: {
            borderRadius: '0',
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
            bg: mode('gray.100', 'gray.785')(props),
            td: {
              borderTop: '1px',
              borderColor: mode('gray.200', 'gray.750')(props),
              fontWeight: 'medium',
            },
          },
          'tr.expanded-details': {
            bg: mode('white', 'gray.785')(props),
            '> td': {
              bg: mode('transparent', 'blackAlpha.400')(props),
            },
            _hover: {
              bg: mode('white', 'gray.785')(props),
              color: 'inherit',
            },
          },
          'tr.expanded td': {
            bg: mode('white', 'blackAlpha.400')(props),
          },
        },
        tfoot: {
          tr: {
            td: {
              bg: mode('white', 'gray.785')(props),
            },
          },
        },
      }
    },
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
