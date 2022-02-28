import { Box, useColorModeValue } from '@chakra-ui/react'
import { useLocation } from 'react-router'
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

type YearnRouteStepsProps = { routes: RouteConfig[] }

export const YearnRouteSteps = ({ routes }: YearnRouteStepsProps) => {
  const location = useLocation()
  const steps = routes.filter(route => route.hasOwnProperty('step'))
  const activeStep = steps.find(step => step.path === location.pathname)

  // styles
  const stepperBg = useColorModeValue('gray.50', 'gray.850')
  const stepperBorder = useColorModeValue('gray.100', 'gray.750')

  return (
    <Box flex={1} minWidth='200px' maxWidth='200px' mr={{ base: 0, md: 4 }} mb={{ base: 4, md: 0 }}>
      <Box bg={stepperBg} p={4} borderRadius='xl' borderColor={stepperBorder} borderWidth={1}>
        <VerticalStepper activeStep={activeStep?.step || 0} steps={steps} />
      </Box>
    </Box>
  )
}
