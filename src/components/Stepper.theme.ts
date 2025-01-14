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
  stepper: {
    '.chakra-step:first-of-type': {
      '.vertical-divider:first-of-type': {
        opacity: 0,
      },
    },
    '.chakra-step:last-of-type': {
      '.vertical-divider:last-of-type': {
        opacity: 0,
      },
    },
  },
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
  step: {
    '&[data-expanded=false]': {
      '.vertical-divider': {
        opacity: '0 !important',
      },
    },
  },
}

const innerSteps = {
  stepper: {
    '.chakra-step:first-of-type': {
      '.vertical-divider:first-of-type': {
        opacity: 1,
      },
    },
  },
  step: {
    '&[data-status=active]': {
      bg: 'background.surface.raised.base',
      borderRadius: '8px',
      '.vertical-divider': {
        opacity: '0 !important',
      },
    },
    '&[data-status=complete] + [data-status=incomplete], &[data-status=complete] + [data-status=complete]':
      {
        '.step-indicator-container': {
          '.vertical-divider:first-of-type': {
            backgroundColor: 'background.success',
          },
        },
      },
    '&[data-status=complete]:has(+ [data-status=incomplete]), &[data-status=complete]:has(+ [data-status=complete])':
      {
        '.step-indicator-container': {
          '.vertical-divider:last-of-type': {
            backgroundColor: 'background.success',
          },
        },
      },
  },
  indicator: {
    width: '16px',
    height: '16px',
    minWidth: '16px',
    borderWidth: '2px',
    // Override the throbbing animation
    '&[data-status=active]:not(.step-pending)': {
      animation: 'none',
    },
    '&[data-status=active]': {
      borderWidth: '2px',
    },
    '&[data-status=incomplete]': {
      borderWidth: '2px',
    },
    '&[data-status=complete]': {
      borderWidth: '2px',
    },
  },
  title: {
    fontSize: 'sm',
    fontWeight: 'medium',
  },
}

const variants = {
  innerSteps,
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
    ...innerSteps,
    indicator: {
      ...innerSteps.indicator,
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
