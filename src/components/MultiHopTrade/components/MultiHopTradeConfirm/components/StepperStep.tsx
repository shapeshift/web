import type { BoxProps, StepTitleProps, SystemStyleObject } from '@chakra-ui/react'
import {
  Box,
  Skeleton,
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
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { useMemo } from 'react'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { useReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { useWallet } from 'hooks/useWallet/useWallet'

const width = { width: '100%' }

export type StepperStepProps = {
  title: string
  description?: string | JSX.Element
  stepIndicator: JSX.Element
  content?: JSX.Element
  isLastStep?: boolean
  isLoading?: boolean
  isError?: boolean
  titleProps?: StepTitleProps
  descriptionProps?: BoxProps
  isPending?: boolean
}

const LastStepTag = () => {
  const wallet = useWallet().state.wallet
  const useReceiveAddressArgs = useMemo(
    () => ({
      fetchUnchainedAddress: Boolean(wallet && isLedger(wallet)),
    }),
    [wallet],
  )

  const { manualReceiveAddress, walletReceiveAddress } = useReceiveAddress(useReceiveAddressArgs)
  const receiveAddress = manualReceiveAddress ?? walletReceiveAddress

  return (
    <Skeleton isLoaded={!!receiveAddress}>
      <Tag size='md' colorScheme='blue'>
        <MiddleEllipsis value={receiveAddress ?? ''} />
      </Tag>
    </Skeleton>
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
}: StepperStepProps) => {
  const { indicator: styles } = useStyleConfig('Stepper', {
    variant: isError ? 'error' : 'default',
  }) as { indicator: SystemStyleObject }

  return (
    <Step style={width}>
      <StepIndicator className={isPending ? 'step-pending' : undefined} sx={styles}>
        {isLoading ? <SkeletonCircle /> : stepIndicator}
      </StepIndicator>

      <Box flex={1}>
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
        {!isLastStep && <Spacer height={6} />}
      </Box>
      {!isLastStep && <StepSeparator />}
    </Step>
  )
}
