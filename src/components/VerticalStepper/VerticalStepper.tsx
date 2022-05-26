import { VStack } from '@chakra-ui/react'
import { Step, Steps } from 'chakra-ui-steps'

export type StepConfig = {
  label: string
  isCompleted?: boolean
  step?: number
  path: string
}

export type StepperState = 'loading' | 'error' | undefined

export type VerticalStepperProps = {
  activeStep: number
  state?: StepperState
  steps: StepConfig[]
}

export const VerticalStepper = ({ state, activeStep, steps }: VerticalStepperProps) => {
  return (
    <VStack width='100%'>
      <Steps
        state={state}
        activeStep={activeStep}
        orientation='horizontal'
        labelOrientation='vertical'
        size='sm'
      >
        {steps.map(step => (
          <Step key={step.label} label={step.label} isCompletedStep={step.isCompleted} />
        ))}
      </Steps>
    </VStack>
  )
}
