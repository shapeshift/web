import { VStack } from '@chakra-ui/react'
import { Step, Steps } from 'chakra-ui-steps'

export type StepConfig = {
  label: string
  hideNav?: boolean
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
      <Steps state={state} activeStep={activeStep} orientation='vertical'>
        {steps
          .filter(step => !step.hideNav)
          .map(step => (
            <Step key={step.label} label={step.label} />
          ))}
      </Steps>
    </VStack>
  )
}
