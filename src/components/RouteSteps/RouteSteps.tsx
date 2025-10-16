import type { BoxProps } from '@chakra-ui/react'
import { Box, useColorModeValue } from '@chakra-ui/react'
import type { Location } from 'history'
import { useMemo } from 'react'

import { Text } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { VerticalStepper } from '@/components/VerticalStepper/VerticalStepper'
import type { StakingAction } from '@/plugins/cosmos/components/modals/Staking/StakingCommon'

export type RouteConfig = {
  step?: number
  path: string
  label: string
  isCompleted?: boolean
}

export enum StatusTextEnum {
  pending = 'modals.status.header.pending',
  success = 'modals.status.header.success',
  failed = 'modals.status.header.failed',
}

type RouteStepsProps = {
  routes: RouteConfig[]
  assetSymbol?: string
  action?: StakingAction
  location: Location
}

export const RouteSteps = ({
  routes,
  assetSymbol,
  action,
  location,
  ...styleProps
}: RouteStepsProps & BoxProps) => {
  const steps = routes.filter(route => route.hasOwnProperty('step'))
  const activeStep = steps.find(step => step.path === location.pathname)

  // styles
  const stepperBg = useColorModeValue('gray.50', 'gray.800')
  const stepperBorder = useColorModeValue('gray.100', 'gray.750')

  const defiActionTranslation: TextPropTypes['translation'] = useMemo(
    () => [`defi.${action}Asset`, { assetSymbol }],
    [action, assetSymbol],
  )

  if (!location) return null

  return (
    <Box
      flex={1}
      bg={stepperBg}
      borderBottomWidth={1}
      borderColor={stepperBorder}
      px={6}
      pb={4}
      {...styleProps}
    >
      {assetSymbol && action && (
        <Text
          my={10}
          fontSize='lg'
          fontWeight='semibold'
          textAlign='center'
          translation={defiActionTranslation}
        />
      )}
      <VerticalStepper activeStep={activeStep?.step || 0} steps={steps} />
    </Box>
  )
}
