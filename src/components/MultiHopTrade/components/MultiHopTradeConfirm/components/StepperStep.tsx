import type { BoxProps, StepProps, StepTitleProps, SystemStyleObject } from '@chakra-ui/react'
import {
  Box,
  Flex,
  SkeletonCircle,
  SkeletonText,
  Step,
  StepDescription,
  StepIndicator,
  StepTitle,
  Tag,
  useStyleConfig,
} from '@chakra-ui/react'
import { InlineCopyButton } from 'components/InlineCopyButton'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { selectActiveQuote } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

const stepStyle = {
  height: 'auto',
  borderWidth: 0,
  backgroundColor: 'transparent',
  '[role=group]:last-of-type &': {
    '.vertical-divider:last-of-type': { opacity: 0 },
  },
}

const VerticalDivider = (props: BoxProps) => (
  <Box
    className='vertical-divider'
    width='2px'
    height='100%'
    flex={1}
    backgroundColor='border.base'
    {...props}
  />
)

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
  stepIndicatorVariant = 'default',
}: StepperStepProps) => {
  const { indicator: indicatorStyles } = useStyleConfig('Stepper', {
    variant: isError
      ? stepIndicatorVariant === 'innerSteps'
        ? 'innerStepsError'
        : 'error'
      : stepIndicatorVariant,
  }) as { indicator: SystemStyleObject }

  return (
    <Step width='100%' px={3} gap={4} role='group' {...stepProps}>
      <Flex flexDir='column' className='step-indicator-container' width='32px' alignItems='center'>
        <VerticalDivider />
        <StepIndicator
          className={isPending ? 'step-pending' : undefined}
          sx={indicatorStyles}
          style={stepIndicatorVariant === 'default' ? stepStyle : undefined}
          borderWidth={0}
          height='auto'
          justifyContent='stretch'
          flexDir='column'
          boxSize={stepIndicatorVariant === 'innerSteps' ? '16px' : 'auto'}
        >
          {isLoading ? <SkeletonCircle /> : stepIndicator}
        </StepIndicator>
        <VerticalDivider opacity={isLastStep ? 0 : 1} />
      </Flex>

      <Flex alignItems='center' py={stepIndicatorVariant === 'innerSteps' ? 2 : 4} flex={1}>
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
        </Box>
        {button}
      </Flex>
      {/* {!isLastStep && <StepSeparator />} */}
    </Step>
  )
}
