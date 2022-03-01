import { Box, useColorModeValue } from '@chakra-ui/react'
import { Location } from 'history'
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

type YearnRouteStepsProps = { routes: RouteConfig[]; location: Location }

export const YearnRouteSteps = ({ routes, location }: YearnRouteStepsProps) => {
  const steps = routes.filter(route => route.hasOwnProperty('step'))
  const activeStep = steps.find(step => step.path === location.pathname)

  // styles
  const stepperBg = useColorModeValue('gray.50', 'gray.800')
  const stepperBorder = useColorModeValue('gray.100', 'gray.750')

  if (!location) return null

  return (
    <Box flex={1} bg={stepperBg} borderBottomWidth={1} borderColor={stepperBorder} px={6} py={4}>
      <Box>
        <VerticalStepper activeStep={activeStep?.step || 0} steps={steps} />
      </Box>
    </Box>
  )
}
