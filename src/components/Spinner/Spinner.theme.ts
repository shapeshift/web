import type { SystemStyleObject } from '@chakra-ui/theme-tools'
import { cssVar } from '@chakra-ui/theme-tools'

const $size = cssVar('spinner-size')

export const SpinnerStyle = {
  // Styles for the base style
  baseStyle: {
    color: 'blue.500',
  },
  // Styles for the size variations
  sizes: {
    xxl: {
      [$size.variable]: '5rem',
    },
  } as Record<string, SystemStyleObject>,
  // Styles for the visual style variations
  variants: {},
  // The default `size` or `variant` values
  defaultProps: {
    speed: '3s',
  },
}
