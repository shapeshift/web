import type { CardProps } from '@chakra-ui/react'

export const cardstyles: CardProps = {
  bg: 'background.surface.base',
  borderColor: {
    base: 'transparent',
    md: 'gray.200',
  },
  boxShadow: 'none',
  borderWidth: {
    base: 0,
    md: 1,
  },
  borderRadius: '3xl',
  _dark: {
    bg: {
      base: 'background.surface.base',
      md: 'darkNeutral.900',
    },
    borderColor: {
      base: 'transparent',
      md: 'rgba(255,255,255,0.05)',
    },
    boxShadow: '0 1px 0 rgba(255,255,255,0.05) inset, 0 2px 5px rgba(0,0,0,.2)',
  },
}
