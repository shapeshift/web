import type { ComponentStyleConfig } from '@chakra-ui/react'
import type { StyleFunctionProps } from '@chakra-ui/theme-tools'
import { mode, transparentize } from '@chakra-ui/theme-tools'

export const ButtonStyle: ComponentStyleConfig = {
  // style object for base or default style
  baseStyle: {
    borderRadius: 'xl',
    _focusVisible: {
      boxShadow: 'outline-inset',
    },
  },
  // styles for different sizes ("sm", "md", "lg")
  sizes: {
    sm: {
      svg: {
        width: '1rem',
        height: '1rem',
      },
      lineHeight: '12px',
    },
    'sm-multiline': {
      svg: {
        width: '1rem',
        height: '1rem',
      },
      whiteSpace: 'normal',
      h: 'auto',
      minH: '10',
      py: '2',
      px: '4',
    },
    lg: (props: StyleFunctionProps) => {
      const { variant: v } = props
      return {
        svg: {
          width: '1.5rem',
          height: '1.5rem',
        },
        fontSize: v === 'nav-link' ? 'md' : 'lg',
        px: v === 'nav-link' ? 4 : 6,
      }
    },
    'lg-multiline': (props: StyleFunctionProps) => {
      const { variant: v } = props
      return {
        svg: {
          width: '1.5rem',
          height: '1.5rem',
        },
        fontSize: v === 'nav-link' ? 'md' : 'lg',
        px: v === 'nav-link' ? 4 : 6,
        whiteSpace: 'normal',
        h: 'auto',
        minH: '12',
        py: '3',
      }
    },
  },
  // styles for different visual variants ("outline", "solid")
  variants: {
    solid: (props: StyleFunctionProps) => {
      const { colorScheme: c } = props
      if (c === 'gray') {
        return {
          bg: 'background.button.secondary.base',
          _hover: {
            bg: 'background.button.secondary.hover',
            textDecoration: 'none',
            _disabled: {
              bg: 'background.button.secondary.base',
            },
          },
          _active: { bg: 'background.button.secondary.pressed' },
          _checked: { bg: 'background.button.secondary.pressed' },
        }
      }
      return {
        bg: `${c}.500`,
        color: 'white',
        _hover: {
          bg: mode(`${c}.600`, `${c}.300`)(props),
          _disabled: {
            bg: `${c}.500`,
          },
        },
        _active: {
          bg: mode(`${c}.700`, `${c}.400`)(props),
        },
      }
    },
    'ghost-filled': (props: StyleFunctionProps) => {
      const { colorScheme: c, theme } = props
      const darkHoverBg = transparentize(`${c}.200`, 0.12)(theme)
      const darkActiveBg = transparentize(`${c}.200`, 1)(theme)
      const darkBg = transparentize(`${c}.200`, 0.2)(theme)
      return {
        color: mode(`${c}.500`, `${c}.200`)(props),
        bg: mode(`${c}.50`, darkBg)(props),
        _hover: {
          bg: mode(`${c}.100`, darkHoverBg)(props),
        },
        _active: {
          bg: mode(`${c}.500`, darkActiveBg)(props),
          color: 'white',
        },
      }
    },
    ghost: (props: StyleFunctionProps) => {
      const { colorScheme: c, theme } = props
      const darkHoverBg = transparentize(`${c}.200`, 0.12)(theme)
      const darkActiveBg = transparentize(`${c}.200`, 0.25)(theme)
      if (c === 'gray') {
        return {
          color: 'text.subtle',
          _hover: {
            color: mode('inherit', 'whiteAlpha.800')(props),
            bg: 'background.button.secondary.base',
          },
          _active: {
            bg: 'background.button.secondary.pressed',
            color: mode('gray.800', 'white')(props),
          },
          _checked: {
            bg: 'background.button.secondary.pressed',
            color: 'text.base',
          },
        }
      }
      return {
        color: mode(`${c}.500`, `${c}.200`)(props),
        _hover: {
          bg: mode(`${c}.50`, darkHoverBg)(props),
          color: mode(`${c}.500`, `${c}.200`)(props),
        },
        _active: {
          bg: mode(`${c}.200`, darkActiveBg)(props),
          color: mode('white', `${c}.200`)(props),
        },
        _checked: {
          bg: mode(`${c}.200`, 'gray.700')(props),
          color: mode('white', `${c}.200`)(props),
        },
      }
    },
    input: (props: StyleFunctionProps) => {
      const { colorScheme: c } = props
      const borderColor = mode('gray.200', 'gray.750')(props)
      const bg = mode('gray.50', 'gray.850')(props)
      return {
        border: '1px solid',
        bg,
        borderColor,
        transition: 'color fill border-color 0.5s ease-in-out',
        color: 'text.subtle',
        _active: {
          borderColor: `${c}.500`,
          color: mode('black', 'white')(props),
          svg: {
            fill: `${c}.500`,
          },
        },
        _hover: {
          borderColor: mode('gray.300', 'gray.700')(props),
        },
      }
    },
    link: (props: StyleFunctionProps) => {
      const { colorScheme: c } = props
      return {
        padding: 0,
        height: 'auto',
        lineHeight: 'normal',
        verticalAlign: 'baseline',
        color: mode(`${c}.500`, `${c}.200`)(props),
        _hover: {
          textDecoration: 'underline',
          _disabled: {
            textDecoration: 'none',
          },
        },
        _active: {
          color: mode(`${c}.700`, `${c}.500`)(props),
        },
        _checked: {
          color: mode(`${c}.700`, `${c}.500`)(props),
        },
      }
    },
    tab: (props: StyleFunctionProps) => {
      const { colorScheme: c } = props
      return {
        py: 4,
        px: 0,
        height: 'auto',
        lineHeight: 'normal',
        verticalAlign: 'baseline',
        borderBottomWidth: '2px',
        marginBottom: {
          base: 0,
          md: '-1px',
        },
        borderColor: 'transparent',
        borderRadius: 0,
        color: 'text.subtle',
        _hover: {
          borderColor: 'border.bold',
        },
        _active: {
          color: mode(`${c}.500`, `${c}.200`)(props),
          borderColor: mode(`${c}.500`, `${c}.200`)(props),
        },
        _checked: {
          color: mode(`${c}.700`, `${c}.500`)(props),
        },
      }
    },
    'read-only': {
      px: 0,
      bg: 'none',
      minWidth: 'auto',
      pointerEvents: 'none',
    },
    'nav-link': (props: StyleFunctionProps) => {
      const { colorScheme: c, theme } = props
      const darkHoverBg = transparentize(`${c}.200`, 0.12)(theme)
      const darkActiveBg = transparentize(`${c}.200`, 0.25)(theme)
      if (c === 'gray') {
        return {
          color: 'text.subtle',
          height: '48px',
          _hover: {
            color: mode('inherit', 'whiteAlpha.800')(props),
            bg: mode('gray.100', 'gray.750')(props),
          },
          _active: {
            bg: mode('gray.200', 'gray.700')(props),
            color: mode('gray.800', 'white')(props),
            svg: {
              color: mode('blue.500', 'blue.200')(props),
            },
            _checked: {
              bg: mode('gray.200', 'gray.700')(props),
            },
          },
        }
      }
      return {
        color: mode(`${c}.500`, `${c}.200`)(props),
        height: '48px',
        _hover: {
          bg: mode(`${c}.50`, darkHoverBg)(props),
          color: mode(`${c}.500`, `${c}.200`)(props),
        },
        _active: {
          bg: mode(`${c}.200`, darkActiveBg)(props),
          color: mode('white', `${c}.200`)(props),
        },
        _checked: {
          bg: mode(`${c}.200`, 'gray.700')(props),
          color: mode('white', `${c}.200`)(props),
        },
      }
    },
  },
  // default values for 'size', 'variant' and 'colorScheme'
  defaultProps: {
    variant: 'solid',
    size: 'md',
    colorScheme: 'gray',
  },
}
