import type { BoxProps, StepProps, StepTitleProps, SystemStyleObject } from '@chakra-ui/react'
import {
  Box,
  Flex,
  SkeletonCircle,
  SkeletonText,
  Spacer,
  Step,
  StepDescription,
  StepIndicator,
  StepSeparator,
  StepTitle,
  Tag,
  useStyleConfig,
} from '@chakra-ui/react'
import { InlineCopyButton } from 'components/InlineCopyButton'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { selectActiveQuote } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

export type StepperStepProps = {
  title: string | JSX.Element
  description?: string | JSX.Element
  stepIndicator: JSX.Element
  content?: JSX.Element
  isLastStep?: boolean
  isLoading?: boolean
  isError?: boolean
  titleProps?: StepTitleProps
  descriptionProps?: BoxProps
  isPending?: boolean
  button?: JSX.Element
  stepProps?: StepProps
  useSpacer?: boolean
  stepIndicatorVariant?: string
}

const LastStepTag = () => {
  const activeQuote = useAppSelector(selectActiveQuote)
  const receiveAddress = activeQuote?.receiveAddress

  if (!receiveAddress) return null

  return (
    <Tag size='md' colorScheme='blue'>
      <InlineCopyButton value={receiveAddress}>
        <MiddleEllipsis value={receiveAddress} />
      </InlineCopyButton>
    </Tag>
  )
}

export const StepperStep = ({
  title,
  stepIndicator,
  description,
  content,
  isLastStep,
  isLoading,
  isError,
  titleProps,
  descriptionProps,
  isPending,
  button,
  stepProps,
  useSpacer = true,
  stepIndicatorVariant = 'default',
}: StepperStepProps) => {
  const { indicator: indicatorStyles } = useStyleConfig('Stepper', {
    variant: isError ? 'error' : stepIndicatorVariant,
  }) as { indicator: SystemStyleObject }

  return (
    <Step width='100%' {...stepProps}>
      <StepIndicator className={isPending ? 'step-pending' : undefined} sx={indicatorStyles}>
        {isLoading ? <SkeletonCircle /> : stepIndicator}
      </StepIndicator>

      <Flex alignItems='center' flex={1}>
        <Box width='100%' flex={1}>
          <StepTitle {...titleProps}>
            <SkeletonText noOfLines={1} skeletonHeight={6} isLoaded={!isLoading}>
              {title}
            </SkeletonText>
          </StepTitle>
          {description && (
            <>
              <StepDescription as={Box} {...descriptionProps}>
                {isLoading ? (
                  <SkeletonText mt={2} noOfLines={1} skeletonHeight={3} isLoaded={!isLoading} />
                ) : (
                  description
                )}
              </StepDescription>
              {isLastStep ? <LastStepTag /> : null}
            </>
          )}
          {content !== undefined && <Box mt={2}>{content}</Box>}
          {!isLastStep && useSpacer && <Spacer height={6} />}
        </Box>
        {button}
      </Flex>
      {!isLastStep && <StepSeparator />}
    </Step>
  )
}
