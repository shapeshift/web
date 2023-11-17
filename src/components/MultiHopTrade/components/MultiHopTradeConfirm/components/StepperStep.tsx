import {
  Box,
  SkeletonCircle,
  SkeletonText,
  Spacer,
  Step,
  StepDescription,
  StepIndicator,
  StepSeparator,
  StepTitle,
} from '@chakra-ui/react'

export type StepperStepProps = {
  title: string
  description?: string | JSX.Element
  stepIndicator: JSX.Element
  content?: JSX.Element
  isActive: boolean
  isLastStep?: boolean
  isLoading?: boolean
}

export const StepperStep = ({
  title,
  stepIndicator,
  description,
  content,
  isActive,
  isLastStep,
  isLoading,
}: StepperStepProps) => {
  return (
    <Step>
      <StepIndicator>{isLoading ? <SkeletonCircle /> : stepIndicator}</StepIndicator>

      <Box flexShrink='0'>
        <StepTitle>
          <SkeletonText noOfLines={1} skeletonHeight={6} isLoaded={!isLoading}>
            {title}
          </SkeletonText>
        </StepTitle>
        {description && (
          <StepDescription>
            {isLoading ? (
              <SkeletonText mt={2} noOfLines={1} skeletonHeight={3} isLoaded={!isLoading} />
            ) : (
              description
            )}
          </StepDescription>
        )}
        {isActive && content}
        {!isLastStep && <Spacer height={6} />}
      </Box>
      <StepSeparator />
    </Step>
  )
}
