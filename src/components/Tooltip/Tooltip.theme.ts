import { cssVar } from '@chakra-ui/system'

const $bg = cssVar('tooltip-bg')
const $fg = cssVar('tooltip-fg')
const $arrowBg = cssVar('popper-arrow-bg')
const $arrowShadowColor = cssVar('popper-arrow-shadow-color')

export const TooltipStyle = {
  // Styles for the base style
  baseStyle: () => ({
    borderRadius: 'lg',
    [$bg.variable]: 'colors.background.surface.overlay.base',
    [$fg.variable]: 'colors.text.base',
    [$arrowBg.variable]: $bg.reference,
    [$arrowShadowColor.variable]: 'gray.200',
    bg: $bg.reference,
    color: $fg.reference,
    p: 3,
    fontSize: 'sm',
    boxShadow: 'lg',
    borderWidth: 1,
    borderColor: 'gray.200',
    _dark: {
      [$bg.variable]: 'colors.background.surface.overlay.base',
      [$fg.variable]: 'colors.text.subtle',
      [$arrowShadowColor.variable]: 'gray.700',
      borderColor: 'gray.700',
      boxShadow: 'dark-lg',
    },
  }),
  // Styles for the size variations
  sizes: {},
  // Styles for the visual style variations
  variants: {},
  // The default `size` or `variant` values
  defaultProps: {},
}
