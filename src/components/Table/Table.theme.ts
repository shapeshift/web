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
          '> :last-child > tr:last-of-type > td:first-of-type': {
            borderBottomLeftRadius: 'xl',
          },
          '> :last-child > tr:last-of-type > td:last-of-type': {
            borderBottomRightRadius: 'xl',
          },
        },
        thead: {
          tr: {
            bg: 'background.surface.raised.base',
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
              bg: mode('gray.100', 'whiteAlpha.100')(props),
              textDecoration: 'none',
              _disabled: {
                bg: 'initial',
              },
            },
            bg: 'transparent',
            td: {
              borderTop: '1px',
              borderColor: 'border.base',
              fontWeight: 'medium',
            },
          },
          'tr.expanded-details': {
            bg: 'transparent',
            '> td': {
              bg: mode('gray.100', 'blackAlpha.400')(props),
            },
            table: {
              tbody: {
                tr: {
                  '@media screen and (min-width: 0em) and (max-width: 767px)': {
                    display: 'flex',
                    flexDirection: 'column',
                    marginBottom: 4,
                    borderRadius: 'xl',
                    td: {
                      display: 'flex',
                      px: 4,
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      _before: {
                        content: 'attr(data-label)',
                        color: 'text.subtle',
                      },
                    },
                    'td:first-of-type': {
                      _before: {
                        display: 'none',
                      },
                      borderTopWidth: 0,
                    },
                  },
                },
              },
              thead: {
                tr: {
                  '@media screen and (min-width: 0em) and (max-width: 767px)': {
                    background: 'transparent',
                    th: {
                      display: 'none',
                      ':first-of-type': {
                        display: 'block',
                      },
                    },
                  },
                },
              },
            },
            _hover: {
              bg: 'surface',
              color: 'inherit',
            },
          },
        },
        tfoot: {
          tr: {
            td: {
              bg: 'background.surface.base',
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
              bg: 'background.surface.raised.base',
              textDecoration: 'none',
              _disabled: {
                bg: 'initial',
              },
            },
            color: 'text.subtle',
            _active: {
              bg: 'background.surface.raised.base',
              color: mode('gray.800', 'white')(props),
            },
            _checked: {
              bg: 'background.surface.raised.pressed',
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
