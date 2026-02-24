import { CheckCircleIcon } from '@chakra-ui/icons'
import { Box, Flex, HStack, VStack } from '@chakra-ui/react'
import { flipAssetId } from '@shapeshiftoss/caip'
import { memo, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import type { DepositStep } from './depositMachine'
import { DepositMachineCtx } from './DepositMachineContext'

import { AssetIcon } from '@/components/AssetIcon'
import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { RawText } from '@/components/Text'

type StepConfig = {
  id: DepositStep
  labelKey: string
  showFlipIcon: boolean
}

const ALL_STEPS: StepConfig[] = [
  {
    id: 'approving_flip',
    labelKey: 'chainflipLending.deposit.steps.approvingFlip',
    showFlipIcon: true,
  },
  {
    id: 'funding_account',
    labelKey: 'chainflipLending.deposit.steps.fundingAccount',
    showFlipIcon: true,
  },
  {
    id: 'registering',
    labelKey: 'chainflipLending.deposit.steps.registering',
    showFlipIcon: false,
  },
  {
    id: 'opening_channel',
    labelKey: 'chainflipLending.deposit.steps.openingChannel',
    showFlipIcon: false,
  },
  {
    id: 'sending_deposit',
    labelKey: 'chainflipLending.deposit.steps.sendingDeposit',
    showFlipIcon: false,
  },
  { id: 'confirming', labelKey: 'chainflipLending.deposit.steps.confirming', showFlipIcon: false },
]

const STEP_ORDER: DepositStep[] = ALL_STEPS.map(s => s.id)

type StepStatus = 'completed' | 'active' | 'error' | 'pending'

const stepIconSize = 5
const checkCircleIcon = <CheckCircleIcon boxSize={stepIconSize} color='green.500' />

export const DepositStepper = memo(() => {
  const translate = useTranslate()
  const stateValue = DepositMachineCtx.useSelector(s => s.value) as string
  const {
    isFunded,
    isLpRegistered,
    flipAllowanceCryptoBaseUnit,
    flipFundingAmountCryptoBaseUnit,
    errorStep,
  } = DepositMachineCtx.useSelector(s => ({
    isFunded: s.context.isFunded,
    isLpRegistered: s.context.isLpRegistered,
    flipAllowanceCryptoBaseUnit: s.context.flipAllowanceCryptoBaseUnit,
    flipFundingAmountCryptoBaseUnit: s.context.flipFundingAmountCryptoBaseUnit,
    errorStep: s.context.errorStep,
  }))

  const needsApproval = useMemo(
    () =>
      !isFunded &&
      BigInt(flipAllowanceCryptoBaseUnit || '0') < BigInt(flipFundingAmountCryptoBaseUnit),
    [isFunded, flipAllowanceCryptoBaseUnit, flipFundingAmountCryptoBaseUnit],
  )

  const visibleSteps = useMemo(() => {
    return ALL_STEPS.filter(step => {
      if (step.id === 'approving_flip') return needsApproval
      if (step.id === 'funding_account') return !isFunded
      if (step.id === 'registering') return !isLpRegistered
      return true
    })
  }, [needsApproval, isFunded, isLpRegistered])

  const getStepStatus = useMemo(() => {
    const currentIndex = STEP_ORDER.indexOf(stateValue as DepositStep)
    const isError = stateValue === 'error'

    return (stepId: DepositStep): StepStatus => {
      if (isError && errorStep === stepId) return 'error'

      const stepIndex = STEP_ORDER.indexOf(stepId)
      if (isError) {
        const errorIndex = STEP_ORDER.indexOf(errorStep as DepositStep)
        if (stepIndex < errorIndex) return 'completed'
        if (stepIndex > errorIndex) return 'pending'
        return 'error'
      }

      if (stateValue === 'success') return 'completed'
      if (stepIndex < currentIndex) return 'completed'
      if (stepIndex === currentIndex) return 'active'
      return 'pending'
    }
  }, [stateValue, errorStep])

  return (
    <VStack spacing={3} align='stretch' width='full'>
      {visibleSteps.map(step => {
        const status = getStepStatus(step.id)
        return (
          <HStack key={step.id} spacing={3} opacity={status === 'pending' ? 0.5 : 1}>
            <Flex alignItems='center' justifyContent='center' width={6} flexShrink={0}>
              {status === 'completed' ? (
                checkCircleIcon
              ) : status === 'active' ? (
                <CircularProgress size='20px' />
              ) : status === 'error' ? (
                <Box boxSize={stepIconSize} borderRadius='full' bg='red.500' />
              ) : (
                <Box
                  boxSize={stepIconSize}
                  borderRadius='full'
                  borderWidth={2}
                  borderColor='border.base'
                />
              )}
            </Flex>
            <HStack spacing={2} flex={1}>
              {step.showFlipIcon ? <AssetIcon assetId={flipAssetId} size='2xs' /> : null}
              <RawText
                fontSize='sm'
                fontWeight={status === 'active' ? 'bold' : 'medium'}
                color={
                  status === 'error'
                    ? 'red.500'
                    : status === 'pending'
                    ? 'text.subtle'
                    : 'text.base'
                }
              >
                {translate(step.labelKey)}
              </RawText>
            </HStack>
          </HStack>
        )
      })}
    </VStack>
  )
})
