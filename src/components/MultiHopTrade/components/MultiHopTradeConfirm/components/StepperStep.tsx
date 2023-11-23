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

const width = { width: '100%' }

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
    <Step style={width}>
      <StepIndicator>{isLoading ? <SkeletonCircle /> : stepIndicator}</StepIndicator>

      <Box flex={1}>
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
        {isActive && <Box mt={2}>{content}</Box>}
        {!isLastStep && <Spacer height={6} />}
      </Box>
      <StepSeparator />
    </Step>
  )
}
