import type { StackProps } from '@chakra-ui/react'
import { Stack, StackDivider, useColorModeValue } from '@chakra-ui/react'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useState } from 'react'

import { StepRow } from './StepRow'

export type StepComponentProps = {
  onNext: (arg: DefiStep) => void
}

type StepConfig = {
  label: string
  component: React.ElementType<StepComponentProps>
  description?: string
  props?: Record<string, any>
}

export type DefiStepProps = { [key in DefiStep]?: StepConfig }

type StepsProps = {
  steps: DefiStepProps
  initialStep?: DefiStep
  persistStepperStatus?: boolean
} & StackProps

export const Steps: React.FC<StepsProps> = ({
  steps,
  children,
  initialStep = DefiStep.Info,
  persistStepperStatus,
  ...rest
}) => {
  const otherSteps = Object.keys(steps).filter(e => persistStepperStatus ?? e !== DefiStep.Status)
  const [currentStep, setCurrentStep] = useState<number>(otherSteps.indexOf(initialStep))
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const Status = steps[DefiStep.Status]?.component ?? null
  const statusIndex = otherSteps.indexOf(DefiStep.Status)

  const handleNext = (nextStep: DefiStep) => setCurrentStep(otherSteps.indexOf(nextStep))

  return (
    <Stack width='full' borderColor={borderColor} divider={<StackDivider />} {...rest}>
      {currentStep === statusIndex && Status && !persistStepperStatus ? (
        <Status onNext={handleNext} />
      ) : (
        <Stack spacing={0} borderColor={borderColor} divider={<StackDivider />}>
          {otherSteps.map((step, index) => {
            const Step = steps[step as DefiStep]
            if (!Step) return null
            const Component = Step.component
            return (
              <StepRow
                label={Step.label}
                key={step}
                description={Step?.description}
                stepNumber={`${index + 1}`}
                isComplete={currentStep > index}
                isActive={currentStep === index}
              >
                <Component onNext={handleNext} {...Step.props} />
              </StepRow>
            )
          })}
        </Stack>
      )}
    </Stack>
  )
}
