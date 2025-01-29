import type { StyleFunctionProps } from '@chakra-ui/theme-tools'
import { mode } from '@chakra-ui/theme-tools'
import { StepsTheme } from 'chakra-ui-steps'

export const StepsStyle = {
  ...StepsTheme,
  baseStyle: (props: StyleFunctionProps) => {
    return {
      ...StepsTheme.baseStyle(props),
      stepIconContainer: {
        ...StepsTheme.baseStyle(props).stepIconContainer,
        bg: 'transparent',
      },
      labelContainer: {
        ...StepsTheme.baseStyle(props).labelContainer,
        '& span': {
          color: 'text.subtle',
        },
        _highlighted: {
          '& span': {
            color: 'green.500',
          },
        },
        _activeStep: {
          '& span': {
            color: mode('black', 'white')(props),
          },
        },
      },
      connector: {
        ...StepsTheme.baseStyle(props).connector,
        borderColor: 'transparent',
      },
    }
  },
}
