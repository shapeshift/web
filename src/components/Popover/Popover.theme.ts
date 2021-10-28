import { cssVar, getColor, mode } from '@chakra-ui/theme-tools'
import { theme } from 'theme/theme'

const $popperBg = cssVar('popper-bg')
const $arrowBg = cssVar('popper-arrow-bg')

export const PopoverStyle = {
  parts: ['content', 'header'],
  // Styles for the base style
  baseStyle: (props: Record<string, any>) => ({
    content: {
      [$popperBg.variable]: mode(getColor(theme, 'white'), getColor(theme, 'gray.750'))(props),
      [$arrowBg.variable]: $popperBg.reference,
      borderRadius: 'xl',
      bg: $popperBg.reference,
      borderColor: mode('gray.200', 'gray.700')(props),
      boxShadow: mode('lg', 'dark-lg')(props)
    },
    header: {
      borderColor: mode('gray.200', 'gray.700')(props)
    }
  }),
  // Styles for the size variations
  sizes: {},
  // Styles for the visual style variations
  variants: {},
  // The default `size` or `variant` values
  defaultProps: {}
}
