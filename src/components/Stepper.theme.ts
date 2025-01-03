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
  innerSteps: {
    step: {
      '&[data-status=active]': {
        bg: 'background.surface.raised.base',
        borderRadius: '8px',
      },
    },
    indicator: {
      width: '20px',
      height: '20px',
      minWidth: '20px',
      borderWidth: '3px',
      // Override the throbbing animation
      '&[data-status=active]:not(.step-pending)': {
        animation: 'none',
      },
      '&[data-status=active]': {
        borderWidth: '3px',
      },
      '&[data-status=incomplete]': {
        borderWidth: '3px',
      },
      '&[data-status=complete]': {
        borderWidth: '3px',
      },
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
  innerStepsError: {
    ...baseStyle.innerSteps,
    indicator: {
      ...baseStyle.innerSteps.indicator,
      '&[data-status=active]:not(.step-pending)': {
        animation: 'none',
        borderWidth: '0',
      },
      '&[data-status=active]': {
        borderWidth: '0',
      },
      '&[data-status=incomplete]': {
        borderWidth: '0',
      },
      '&[data-status=complete]': {
        borderWidth: '0',
      },
    },
  },
}

export const stepperTheme = {
  baseStyle,
  variants,
}
