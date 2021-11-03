import { Box, useColorModeValue } from '@chakra-ui/react'
import { useLocation } from 'react-router'
import { VerticalStepper } from 'components/VerticalStepper/VerticalStepper'

export type RouteConfig = {
  step?: number
  path: string
  label: string
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
    <Box
      bg={stepperBg}
      px={4}
      py={6}
      flex={1}
      borderRightWidth={{ base: 0, lg: 1 }}
      borderBottomWidth={{ base: 1, lg: 0 }}
      borderColor={stepperBorder}
      borderTopLeftRadius='xl'
      borderTopRightRadius={{ base: 'xl', lg: 'none' }}
      borderBottomLeftRadius={{ base: 'none', lg: 'xl' }}
      minWidth='250px'
    >
      <VerticalStepper activeStep={activeStep?.step || 0} steps={steps} />
    </Box>
  )
}
