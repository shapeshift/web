import { cssVar } from '@chakra-ui/theme-tools'

const $popperBg = cssVar('popper-bg')
const $arrowBg = cssVar('popper-arrow-bg')

export const PopoverStyle = {
  parts: ['content', 'header'],
  // Styles for the base style
  baseStyle: {
    content: {
      [$popperBg.variable]: 'colors.white',
      [$arrowBg.variable]: $popperBg.reference,
      borderRadius: 'xl',
      bg: $popperBg.reference,
      borderColor: 'gray.200',
      boxShadow: 'lg',
      _dark: {
        [$popperBg.variable]: 'colors.background.surface.overlay.base',
        borderColor: 'gray.700',
        boxShadow: 'dark-lg',
      },
    },
    header: {
      borderColor: 'gray.100',
      _dark: {
        borderColor: 'gray.700',
      },
    },
  },
  // Styles for the size variations
  sizes: {},
  // Styles for the visual style variations
  variants: {},
  // The default `size` or `variant` values
  defaultProps: {},
}
