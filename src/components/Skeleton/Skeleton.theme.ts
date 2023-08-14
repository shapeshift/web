import { keyframes } from '@chakra-ui/system'
import type { SystemStyleFunction } from '@chakra-ui/theme-tools'
import { getColor } from '@chakra-ui/theme-tools'

const fade = (startColor: string, endColor: string) =>
  keyframes({
    from: { borderColor: startColor, background: startColor },
    to: { borderColor: endColor, background: endColor },
  })

const baseStyle: SystemStyleFunction = props => {
  const {
    startColor = 'background.surface.raised.base',
    endColor = 'background.surface.rasied.pressed',
    speed,
    theme,
  } = props

  const start = getColor(theme, startColor)
  const end = getColor(theme, endColor)

  return {
    opacity: 0.7,
    borderRadius: 'md',
    borderColor: start,
    background: end,
    animation: `${speed}s linear infinite alternate ${fade('red', end)}`,
  }
}

const sizes = {
  sm: {
    maxWidth: '80px',
    whiteSpace: 'nowrap',
  },
  md: {
    maxWidth: '200px',
    whiteSpace: 'nowrap',
  },
}

const variants = {
  center: {
    marginLeft: 'auto',
    marginRight: 'auto',
  },
}

export const SkeletonStyle = {
  baseStyle,
  sizes,
  variants,
  defaultProps: {
    startColor: 'background.surface.raised.base', // Customize this value
    endColor: 'background.surface.raised.pressed', // Customize this value
  },
}
