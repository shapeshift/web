const baseStyle = {
  // select the indicator part
  indicator: {
    // change the default border radius to 0
    '&[data-status=complete]': {
      bg: 'rgba(92, 223, 189, 0.20)',
    },
  },
}

export const stepperTheme = {
  baseStyle,
}
