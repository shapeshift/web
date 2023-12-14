const baseStyle = {
  // select the indicator part
  indicator: {
    '&[data-status=active]': {
      bg: 'background.surface.raised.base',
      borderColor: 'blue.500',
    },
    '&[data-status=incomplete]': {
      bg: 'background.surface.raised.base',
      borderColor: 'border.base',
    },
    '&[data-status=complete]': {
      bg: 'background.success',
    },
  },
  separator: {
    bg: 'border.base',
    '&[data-status=complete]': {
      bg: 'green.500',
    },
    '&[data-status=active]': {
      bg: 'border.base',
    },
  },
}

const variants = {
  error: {
    indicator: {
      '&[data-status=active]': {
        bg: 'background.surface.raised.base',
        borderColor: 'red.500',
      },
      '&[data-status=incomplete]': {
        bg: 'background.surface.raised.base',
        borderColor: 'border.base',
      },
      '&[data-status=complete]': {
        bg: 'background.error',
      },
    },
  },
  // other variants if needed
}

export const stepperTheme = {
  baseStyle,
  variants,
}
