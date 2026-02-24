import { CheckCircleIcon } from '@chakra-ui/icons'
import { Box, Flex, HStack, Link, VStack } from '@chakra-ui/react'
import { ethAssetId, flipAssetId } from '@shapeshiftoss/caip'
import { memo, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import type { DepositStep, DepositTxHashes } from './depositMachine'
import { DepositMachineCtx } from './DepositMachineContext'

import { AssetIcon } from '@/components/AssetIcon'
import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { RawText } from '@/components/Text'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { useAppSelector } from '@/state/store'

type StepConfig = {
  id: DepositStep
  labelKey: string
  showFlipIcon: boolean
  txHashKey: keyof DepositTxHashes | null
}

const ALL_STEPS: StepConfig[] = [
  {
    id: 'approving_flip',
    labelKey: 'chainflipLending.deposit.steps.approvingFlip',
    showFlipIcon: true,
    txHashKey: 'approval',
  },
  {
    id: 'funding_account',
    labelKey: 'chainflipLending.deposit.steps.fundingAccount',
    showFlipIcon: true,
    txHashKey: 'funding',
  },
  {
    id: 'registering',
    labelKey: 'chainflipLending.deposit.steps.registering',
    showFlipIcon: false,
    txHashKey: 'registration',
  },
  {
    id: 'setting_refund_address',
    labelKey: 'chainflipLending.deposit.steps.settingRefundAddress',
    showFlipIcon: false,
    txHashKey: 'refundAddress',
  },
  {
    id: 'opening_channel',
    labelKey: 'chainflipLending.deposit.steps.openingChannel',
    showFlipIcon: false,
    txHashKey: 'channel',
  },
  {
    id: 'sending_deposit',
    labelKey: 'chainflipLending.deposit.steps.sendingDeposit',
    showFlipIcon: false,
    txHashKey: 'deposit',
  },
  {
    id: 'confirming',
    labelKey: 'chainflipLending.deposit.steps.confirming',
    showFlipIcon: false,
    txHashKey: null,
  },
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
    hasRefundAddress,
    flipAllowanceCryptoBaseUnit,
    flipFundingAmountCryptoBaseUnit,
    txHashes,
    errorStep,
  } = DepositMachineCtx.useSelector(s => ({
    isFunded: s.context.isFunded,
    isLpRegistered: s.context.isLpRegistered,
    hasRefundAddress: s.context.hasRefundAddress,
    flipAllowanceCryptoBaseUnit: s.context.flipAllowanceCryptoBaseUnit,
    flipFundingAmountCryptoBaseUnit: s.context.flipFundingAmountCryptoBaseUnit,
    txHashes: s.context.txHashes,
    errorStep: s.context.errorStep,
  }))

  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const explorerTxLink = ethAsset?.explorerTxLink

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
      if (step.id === 'setting_refund_address') return !hasRefundAddress
      return true
    })
  }, [needsApproval, isFunded, isLpRegistered, hasRefundAddress])

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
        const txHash = step.txHashKey ? txHashes[step.txHashKey] : undefined
        const isEvmHash = txHash?.startsWith('0x')
        const txLink = isEvmHash && explorerTxLink ? `${explorerTxLink}${txHash}` : undefined
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
            <Flex alignItems='center' justifyContent='space-between' flex={1}>
              <HStack spacing={2}>
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
              {txHash ? (
                txLink ? (
                  <Link isExternal href={txLink} color='text.link' fontSize='xs'>
                    <MiddleEllipsis value={txHash} />
                  </Link>
                ) : (
                  <RawText fontSize='xs' color='text.subtle'>
                    <MiddleEllipsis value={txHash} />
                  </RawText>
                )
              ) : null}
            </Flex>
          </HStack>
        )
      })}
    </VStack>
  )
})
