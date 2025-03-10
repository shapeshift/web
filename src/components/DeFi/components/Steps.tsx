import type { StackProps } from '@chakra-ui/react'
import { Stack, StackDivider, useColorModeValue } from '@chakra-ui/react'
import { useCallback, useState } from 'react'

import { StepRow } from './StepRow'

import { DefiStep } from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'

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

const divider = <StackDivider />

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

  const handleNext = useCallback(
    (nextStep: DefiStep) => setCurrentStep(otherSteps.indexOf(nextStep)),
    [otherSteps],
  )

  return (
    <Stack width='full' borderColor={borderColor} divider={divider} {...rest}>
      {currentStep === statusIndex && Status && !persistStepperStatus ? (
        <Status onNext={handleNext} />
      ) : (
        <Stack spacing={0} borderColor={borderColor} divider={divider}>
          {otherSteps.map((step, index) => {
            const Step = steps[step as DefiStep]
            if (!Step) return null
            const Component = Step.component
            const isActive = currentStep === index
            return (
              <StepRow
                label={Step.label}
                key={step}
                description={Step?.description}
                stepNumber={`${index + 1}`}
                isComplete={currentStep > index}
                isActive={isActive}
              >
                {isActive && <Component onNext={handleNext} {...Step.props} />}
              </StepRow>
            )
          })}
        </Stack>
      )}
    </Stack>
  )
}
