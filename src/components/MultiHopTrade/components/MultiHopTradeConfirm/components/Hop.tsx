import {
  Box,
  Card,
  CardFooter,
  Divider,
  HStack,
  Step,
  StepDescription,
  StepIndicator,
  Stepper,
  StepSeparator,
  StepTitle,
  useColorModeValue,
} from '@chakra-ui/react'
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
        {steps.map(({ title, stepIndicator, description, content }, index) => (
          <Step key={index}>
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
      <CardFooter>
        <Divider />
        <HStack width='full'>
          <Amount.Percent value={slippageDecimalPercentage} display='inline' />
          {/* TODO: hovering over this should render a popover with details */}
          <Amount.Fiat value={networkFeeFiatPrecision} display='inline' />
          {/* TODO: hovering over this should render a popover with details */}
          <Amount.Fiat value={protocolFeeFiatPrecision} display='inline' />
        </HStack>
      </CardFooter>
    </Card>
  )
}
