import { Box, BoxProps, useColorModeValue } from '@chakra-ui/react'
import { StakingAction } from 'plugins/cosmos/components/modals/Staking/Staking'
import { useLocation } from 'react-router'
import { Text } from 'components/Text'
import { VerticalStepper } from 'components/VerticalStepper/VerticalStepper'

export type RouteConfig = {
  step?: number
  path: string
  label: string
}

export enum StatusTextEnum {
  pending = 'modals.status.header.pending',
  success = 'modals.status.header.success',
  failed = 'modals.status.header.failed'
}

type RouteStepsProps = { routes: RouteConfig[]; assetSymbol?: string; action?: StakingAction }

export const RouteSteps = ({
  routes,
  assetSymbol,
  action,
  ...styleProps
}: RouteStepsProps & BoxProps) => {
  const location = useLocation()
  const steps = routes.filter(route => route.hasOwnProperty('step'))
  const activeStep = steps.find(step => step.path === location.pathname)

  // styles
  const stepperBg = useColorModeValue('gray.50', 'gray.850')
  const stepperBorder = useColorModeValue('gray.100', 'gray.750')

  return (
    <Box
      bg={stepperBg}
      flex={1}
      borderRightWidth={{ base: 0, lg: 1 }}
      borderBottomWidth={{ base: 1, lg: 0 }}
      borderColor={stepperBorder}
      borderTopLeftRadius='xl'
      borderTopRightRadius={{ base: 'xl', lg: 'none' }}
      borderBottomLeftRadius={{ base: 'none', lg: 'xl' }}
      minWidth='250px'
      {...styleProps}
    >
      {assetSymbol && action && (
        <Text mb={30} fontWeight='bold' translation={[`defi.${action}Asset`, { assetSymbol }]} />
      )}
      <VerticalStepper activeStep={activeStep?.step || 0} steps={steps} />
    </Box>
  )
}
