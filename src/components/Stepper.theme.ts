const baseStyle = {
  // select the indicator part
  indicator: {
    // change the default border radius to 0
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

export const stepperTheme = {
  baseStyle,
}
