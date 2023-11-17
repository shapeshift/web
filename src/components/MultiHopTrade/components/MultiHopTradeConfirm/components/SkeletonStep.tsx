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

export type SkeletonStepProps = {
  isLastStep?: boolean
}

export const SkeletonStep = ({ isLastStep }: SkeletonStepProps) => {
  return (
    <Step>
      <StepIndicator>
        <SkeletonCircle />
      </StepIndicator>

      <Box flexShrink='0'>
        <StepTitle>
          <SkeletonText noOfLines={1} skeletonHeight={6} isLoaded={false} width={48} />
        </StepTitle>
        <StepDescription>
          <SkeletonText mt={2} noOfLines={1} skeletonHeight={3} isLoaded={false} width={52} />
        </StepDescription>
        {!isLastStep && <Spacer height={6} />}
      </Box>
      <StepSeparator />
    </Step>
  )
}
