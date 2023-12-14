import { keyframes } from '@chakra-ui/react'

const throb = keyframes({
  '0%': {
    boxShadow: '0 0 0 0px rgba(55, 97, 249, 1)',
  },
  '100%': {
    boxShadow: '0 0 0 15px rgba(55, 97, 249, 0)',
  },
})

const baseStyle = {
  // select the indicator part
  indicator: {
    '&[data-status=active]': {
      bg: 'background.surface.raised.base',
      borderColor: 'blue.500',
    },
    // add throbbing to active steps that are not current executing (to get user attention)
    '&[data-status=active]:not(.step-pending)': {
      animation: `${throb} 1s infinite cubic-bezier(0.87, 0, 0.13, 1)`,
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
      bg: 'blue.500',
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
