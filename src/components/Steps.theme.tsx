import type { StyleFunctionProps } from '@chakra-ui/theme-tools'
import { mode } from '@chakra-ui/theme-tools'
import { StepsStyleConfig } from 'chakra-ui-steps'

export const StepsStyle = {
  ...StepsStyleConfig,
  baseStyle: (props: StyleFunctionProps) => {
    return {
      ...StepsStyleConfig.baseStyle(props),
      stepIconContainer: {
        ...StepsStyleConfig.baseStyle(props).stepIconContainer,
        bg: 'transparent',
      },
      labelContainer: {
        ...StepsStyleConfig.baseStyle(props).labelContainer,
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
        ...StepsStyleConfig.baseStyle(props).connector,
        borderColor: 'transparent',
      },
    }
  },
}
