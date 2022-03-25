import { keyframes } from '@chakra-ui/system'
import type { SystemStyleFunction } from '@chakra-ui/theme-tools'
import { getColor, mode } from '@chakra-ui/theme-tools'

const fade = (startColor: string, endColor: string) =>
  keyframes({
    from: { borderColor: startColor, background: startColor },
    to: { borderColor: endColor, background: endColor }
  })

const baseStyle: SystemStyleFunction = props => {
  const defaultStartColor = mode('gray.100', 'gray.750')(props)
  const defaultEndColor = mode('gray.300', 'gray.700')(props)

  const { startColor = defaultStartColor, endColor = defaultEndColor, speed, theme } = props

  const start = getColor(theme, startColor)
  const end = getColor(theme, endColor)

  return {
    opacity: 0.7,
    borderRadius: 'md',
    borderColor: start,
    background: end,
    animation: `${speed}s linear infinite alternate ${fade(start, end)}`
  }
}

const sizes = {
  sm: {
    maxWidth: '80px',
    whiteSpace: 'nowrap'
  },
  md: {
    maxWidth: '200px',
    whiteSpace: 'nowrap'
  }
}

const variants = {
  center: {
    marginLeft: 'auto',
    marginRight: 'auto'
  }
}

export const SkeletonStyle = {
  baseStyle,
  sizes,
  variants
}
