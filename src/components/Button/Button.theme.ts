import { mode, transparentize } from '@chakra-ui/theme-tools'

const baseStyle = {
  lineHeight: '1.2',
  borderRadius: 'lg',
  fontWeight: 'semibold',
  transitionProperty: 'common',
  transitionDuration: 'normal',
  _focus: {
    boxShadow: 'outline-inset'
  },
  _disabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
    boxShadow: 'none'
  },
  _hover: {
    _disabled: {
      bg: 'initial'
    }
  }
}

function variantGhost(props: Record<string, any>) {
  const { colorScheme: c, theme } = props

  if (c === 'gray') {
    return {
      color: mode(`gray.500`, `gray.500`)(props),
      _hover: {
        color: mode('inherit', 'whiteAlpha.800')(props),
        bg: mode(`gray.100`, `gray.750`)(props)
      },
      _active: { bg: mode(`gray.200`, `gray.700`)(props), color: mode(`gray.800`, 'white')(props) },
      _checked: { bg: mode(`gray.200`, `gray.700`)(props) }
    }
  }

  const darkHoverBg = transparentize(`${c}.200`, 0.12)(theme)
  const darkActiveBg = transparentize(`${c}.700`, 1)(theme)

  return {
    color: mode(`${c}.600`, `${c}.200`)(props),
    bg: 'transparent',
    _hover: {
      bg: mode(`${c}.50`, darkHoverBg)(props)
    },
    _active: {
      bg: mode(`${c}.100`, darkActiveBg)(props)
    },
    _checked: {
      bg: mode(`${c}.100`, darkActiveBg)(props)
    }
  }
}

function variantGhostFilled(props: Record<string, any>) {
  const { colorScheme: c, theme } = props

  if (c === 'gray') {
    return {
      color: mode(`inherit`, `whiteAlpha.900`)(props),
      _hover: {
        bg: mode(`gray.100`, `gray.750`)(props)
      },
      _active: { bg: mode(`gray.200`, `gray.700`)(props) },
      _checked: { bg: mode(`gray.200`, `gray.700`)(props) }
    }
  }

  const darkHoverBg = transparentize(`${c}.200`, 0.12)(theme)
  const darkActiveBg = transparentize(`${c}.500`, 1)(theme)
  const darkBg = transparentize(`${c}.200`, 0.2)(theme)

  return {
    color: mode(`${c}.800`, `${c}.200`)(props),
    bg: mode(`${c}.200`, darkBg)(props),
    _hover: {
      bg: mode(`${c}.500`, darkHoverBg)(props),
      color: 'white'
    },
    _active: {
      bg: mode(`${c}.500`, darkActiveBg)(props),
      color: 'white'
    },
    _checked: {
      bg: mode(`${c}.500`, darkActiveBg)(props),
      color: 'white'
    }
  }
}

function variantOutline(props: Record<string, any>) {
  const { colorScheme: c } = props
  const borderColor = mode(`gray.200`, `whiteAlpha.300`)(props)
  return {
    border: '1px solid',
    borderColor: c === 'gray' ? borderColor : 'currentColor',
    ...variantGhost(props)
  }
}

type AccessibleColor = {
  bg?: string
  color?: string
  hoverBg?: string
  activeBg?: string
}

/** Accessible color overrides for less accessible colors. */
const accessibleColorMap: { [key: string]: AccessibleColor } = {
  yellow: {
    bg: 'yellow.400',
    color: 'black',
    hoverBg: 'yellow.500',
    activeBg: 'yellow.600'
  },
  cyan: {
    bg: 'cyan.400',
    color: 'black',
    hoverBg: 'cyan.500',
    activeBg: 'cyan.600'
  },
  blue: {
    bg: 'blue.500',
    color: 'white'
  }
}

function variantSolid(props: Record<string, any>) {
  const { colorScheme: c } = props

  if (c === 'gray') {
    const bg = mode(`gray.100`, `gray.700`)(props)

    return {
      bg,
      _hover: {
        bg: mode(`gray.200`, `gray.600`)(props),
        _disabled: {
          bg
        }
      },
      _active: { bg: mode(`gray.300`, `whiteAlpha.400`)(props) },
      _checked: { bg: mode(`gray.300`, `whiteAlpha.400`)(props) }
    }
  }

  const {
    bg = `${c}.500`,
    color = 'white',
    hoverBg = `${c}.600`,
    activeBg = `${c}.700`
  } = accessibleColorMap[c] || {}

  const background = mode(bg, `${c}.500`)(props)

  return {
    bg: background,
    color: mode(color, `white`)(props),
    _hover: {
      bg: mode(hoverBg, `${c}.300`)(props),
      _disabled: {
        bg: background
      }
    },
    _active: { bg: mode(activeBg, `${c}.400`)(props) },
    _checked: { bg: mode(activeBg, `${c}.400`)(props) }
  }
}

function variantLink(props: Record<string, any>) {
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
        textDecoration: 'none'
      }
    },
    _active: {
      color: mode(`${c}.700`, `${c}.500`)(props)
    },
    _checked: {
      color: mode(`${c}.700`, `${c}.500`)(props)
    }
  }
}

const variantUnstyled = {
  bg: 'none',
  color: 'inherit',
  display: 'inline',
  lineHeight: 'inherit',
  m: 0,
  p: 0
}

const variants = {
  ghost: variantGhost,
  'ghost-filled': variantGhostFilled,
  outline: variantOutline,
  solid: variantSolid,
  link: variantLink,
  unstyled: variantUnstyled
}

const sizes = {
  lg: {
    h: 12,
    minW: 12,
    fontSize: 'lg',
    px: 6
  },
  md: {
    h: 10,
    minW: 10,
    fontSize: 'md',
    px: 4
  },
  sm: {
    h: 8,
    minW: 8,
    fontSize: 'sm',
    px: 3
  },
  xs: {
    h: 6,
    minW: 6,
    fontSize: 'xs',
    px: 2
  }
}

const defaultProps = {
  variant: 'solid',
  size: 'md',
  colorScheme: 'gray'
}

export const ButtonStyle = {
  baseStyle,
  variants,
  sizes,
  defaultProps
}
