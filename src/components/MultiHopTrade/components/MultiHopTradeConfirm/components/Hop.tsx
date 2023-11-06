import {
  Box,
  Card,
  CardFooter,
  Divider,
  Flex,
  HStack,
  Step,
  StepDescription,
  StepIndicator,
  Stepper,
  StepSeparator,
  StepTitle,
  useColorModeValue,
} from '@chakra-ui/react'
import { FaAdjust, FaGasPump, FaProcedures } from 'react-icons/fa'
import { Amount } from 'components/Amount/Amount'
import type { StepperStep } from 'components/MultiHopTrade/types'

const cardBorderRadius = { base: 'xl' }

export const Hop = ({
  steps,
  activeStep,
  slippageDecimalPercentage,
  networkFeeFiatPrecision,
  protocolFeeFiatPrecision,
}: {
  steps: StepperStep[]
  activeStep: number
  slippageDecimalPercentage: string
  networkFeeFiatPrecision: string
  protocolFeeFiatPrecision: string
}) => {
  const backgroundColor = useColorModeValue('gray.100', 'gray.750')
  const borderColor = useColorModeValue('gray.50', 'gray.650')

  return (
    <Card
      flex={1}
      borderRadius={cardBorderRadius}
      width='full'
      backgroundColor={backgroundColor}
      borderColor={borderColor}
    >
      <Stepper
        index={activeStep}
        orientation='vertical'
        gap='0'
        height={steps.length * 60}
        margin={6}
      >
        {steps.map(({ title, stepIndicator, description, content, key }, index) => (
          <Step key={key}>
            <StepIndicator>{stepIndicator}</StepIndicator>

            <Box flexShrink='0'>
              <StepTitle>{title}</StepTitle>
              {description && <StepDescription>{description}</StepDescription>}
              {index === activeStep && content}
            </Box>
            <StepSeparator />
          </Step>
        ))}
      </Stepper>
      <Divider />
      <CardFooter>
        <HStack width='full' justifyContent='space-between'>
          {/* Hovering over this should render a popover with details */}
          <Flex alignItems='center'>
            <Box marginRight={2} color='text.subtle'>
              <FaGasPump />
            </Box>
            <Amount.Fiat value={networkFeeFiatPrecision} display='inline' />
          </Flex>

          {/* Hovering over this should render a popover with details */}
          <Flex alignItems='center'>
            {/* Placeholder - use correct icon here */}

            <Box marginRight={2} color='text.subtle'>
              <FaProcedures />
            </Box>
            <Amount.Fiat value={protocolFeeFiatPrecision} display='inline' />
          </Flex>

          <Flex alignItems='center'>
            {/* Placeholder - use correct icon here */}

            <Box marginRight={2} color='text.subtle'>
              <FaAdjust />
            </Box>
            <Amount.Percent value={slippageDecimalPercentage} display='inline' />
          </Flex>
        </HStack>
      </CardFooter>
    </Card>
  )
}
