import { Stack, StackDivider, StackProps, useColorModeValue } from '@chakra-ui/react'
import { DefiSteps } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useState } from 'react'

import { StepRow } from './StepRow'

export type StepComponentProps = {
  onNext: (arg: DefiSteps) => void
}

type StepConfig = {
  label: string
  component: React.ElementType<StepComponentProps>
  description?: string
}

export type DefiStepProps = { [key in DefiSteps]?: StepConfig }

type StepsProps = {
  steps: DefiStepProps
  initialStep?: DefiSteps
} & StackProps

export const Steps: React.FC<StepsProps> = ({
  steps,
  children,
  initialStep = DefiSteps.Info,
  ...rest
}) => {
  const array = Object.keys(steps).filter(e => e !== DefiSteps.Status)
  const [currentStep, setCurrentStep] = useState<number>(array.indexOf(initialStep))
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const Status = steps[DefiSteps.Status as DefiSteps]?.component ?? null
  const StatusIndex = array.indexOf(DefiSteps.Status)

  const handleNext = (nextStep: DefiSteps) => {
    const index = array.indexOf(nextStep)
    setCurrentStep(index)
  }

  return (
    <Stack width='full' borderColor={borderColor} divider={<StackDivider />} {...rest}>
      {currentStep === StatusIndex && Status ? (
        <Status onNext={handleNext} />
      ) : (
        <Stack spacing={0} borderColor={borderColor} divider={<StackDivider />}>
          {array.map((step, index) => {
            const Step = steps[step as DefiSteps]
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
                <Component onNext={handleNext} />
              </StepRow>
            )
          })}
        </Stack>
      )}
    </Stack>
  )
}
