import { Avatar, Box, Button, Flex, Heading, Icon, Link, Text, VStack } from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import { memo, useEffect, useMemo } from 'react'
import ReactCanvasConfetti from 'react-canvas-confetti'
import { FaCheck, FaExternalLinkAlt, FaWallet } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { Dialog } from '@/components/Modal/components/Dialog'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogCloseButton } from '@/components/Modal/components/DialogCloseButton'
import { DialogFooter } from '@/components/Modal/components/DialogFooter'
import { DialogHeader } from '@/components/Modal/components/DialogHeader'
import { DialogTitle } from '@/components/Modal/components/DialogTitle'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { formatYieldTxTitle, getTransactionButtonText } from '@/lib/yieldxyz/utils'
import { GradientApy } from '@/pages/Yields/components/GradientApy'
import { TransactionStepsList } from '@/pages/Yields/components/TransactionStepsList'
import { useConfetti } from '@/pages/Yields/hooks/useConfetti'
import type { TransactionStep } from '@/pages/Yields/hooks/useYieldTransactionFlow'
import { ModalStep, useYieldTransactionFlow } from '@/pages/Yields/hooks/useYieldTransactionFlow'
import { useYieldProviders } from '@/react-queries/queries/yieldxyz/useYieldProviders'
import { useYieldValidators } from '@/react-queries/queries/yieldxyz/useYieldValidators'
import {
  selectFeeAssetByChainId,
  selectMarketDataByAssetIdUserCurrency,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const walletIcon = <FaWallet color='text.base' />
const checkIconBox = (
  <Box p={2}>
    <Icon as={FaCheck} color='text.base' />
  </Box>
)

type YieldActionModalProps = {
  isOpen: boolean
  onClose: () => void
  yieldItem: AugmentedYieldDto
  action: 'enter' | 'exit' | 'manage'
  amount: string
  assetSymbol: string
  assetLogoURI?: string
  validatorAddress?: string
  validatorName?: string
  validatorLogoURI?: string
  passthrough?: string
  manageActionType?: string
}

export const YieldActionModal = memo(function YieldActionModal({
  isOpen,
  onClose,
  yieldItem,
  action,
  amount,
  assetSymbol,
  assetLogoURI,
  validatorAddress,
  validatorName,
  validatorLogoURI,
  passthrough,
  ...props
}: YieldActionModalProps) {
  const translate = useTranslate()

  const {
    step,
    transactionSteps,
    isSubmitting,
    activeStepIndex,
    canSubmit,
    handleConfirm,
    handleClose,
    isQuoteLoading,
    quoteData,
    isAllowanceCheckPending,
    isUsdtResetRequired,
  } = useYieldTransactionFlow({
    yieldItem,
    action,
    amount,
    assetSymbol,
    onClose,
    isOpen,
    validatorAddress,
    passthrough,
    manageActionType: props.manageActionType,
  })

  const shouldFetchValidators = useMemo(
    () => yieldItem.mechanics.type === 'staking' && yieldItem.mechanics.requiresValidatorSelection,
    [yieldItem.mechanics.type, yieldItem.mechanics.requiresValidatorSelection],
  )

  const { data: validators } = useYieldValidators(yieldItem.id, shouldFetchValidators)

  const { data: providers } = useYieldProviders()
  const inputTokenAssetId = useMemo(
    () => yieldItem.inputTokens[0]?.assetId ?? '',
    [yieldItem.inputTokens],
  )
  const marketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, inputTokenAssetId),
  )

  const vaultMetadata = useMemo(() => {
    if (yieldItem.mechanics.type === 'staking' && validatorAddress) {
      const validator = validators?.find(v => v.address === validatorAddress)
      if (validator) return { name: validator.name, logoURI: validator.logoURI }
      if (validatorName) return { name: validatorName, logoURI: validatorLogoURI }
    }
    const provider = providers?.[yieldItem.providerId]
    if (provider) return { name: provider.name, logoURI: provider.logoURI }
    return { name: 'Vault', logoURI: yieldItem.metadata.logoURI }
  }, [yieldItem, validatorAddress, validatorName, validatorLogoURI, validators, providers])

  const chainId = useMemo(() => yieldItem.chainId ?? '', [yieldItem.chainId])
  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, chainId))

  const horizontalScroll = useMemo(
    () => keyframes`
      0% { background-position: 0 0; }
      100% { background-position: 28px 0; }
    `,
    [],
  )

  const flexDirection = useMemo(
    () => (action === 'enter' ? 'row' : 'row-reverse') as 'row' | 'row-reverse',
    [action],
  )

  const assetAvatarSrc = useMemo(
    () => assetLogoURI ?? yieldItem.token.logoURI,
    [assetLogoURI, yieldItem.token.logoURI],
  )

  const aprFormatted = useMemo(
    () => `${bnOrZero(yieldItem.rewardRate.total).times(100).toFixed(2)}%`,
    [yieldItem.rewardRate.total],
  )

  const showEstimatedEarnings = useMemo(() => bnOrZero(amount).gt(0), [amount])

  const estimatedEarningsAmount = useMemo(
    () =>
      `${bnOrZero(amount)
        .times(yieldItem.rewardRate.total)
        .decimalPlaces(4)
        .toString()} ${assetSymbol}/yr`,
    [amount, yieldItem.rewardRate.total, assetSymbol],
  )

  const estimatedEarningsFiat = useMemo(
    () =>
      bnOrZero(amount)
        .times(yieldItem.rewardRate.total)
        .times(marketData?.price ?? 0)
        .toString(),
    [amount, yieldItem.rewardRate.total, marketData?.price],
  )

  const isStaking = useMemo(
    () => yieldItem.mechanics.type === 'staking',
    [yieldItem.mechanics.type],
  )

  const showValidatorRow = useMemo(
    () => isStaking && vaultMetadata.name !== 'Vault',
    [isStaking, vaultMetadata.name],
  )

  const isButtonDisabled = useMemo(
    () => !canSubmit || isSubmitting || isQuoteLoading,
    [canSubmit, isSubmitting, isQuoteLoading],
  )

  const isButtonLoading = useMemo(
    () => isSubmitting || isQuoteLoading || isAllowanceCheckPending,
    [isSubmitting, isQuoteLoading, isAllowanceCheckPending],
  )

  const loadingText = useMemo(() => {
    if (isQuoteLoading) return translate('yieldXYZ.loadingQuote')
    if (activeStepIndex >= 0 && transactionSteps[activeStepIndex]?.loadingMessage) {
      return transactionSteps[activeStepIndex].loadingMessage
    }
    if (action === 'enter') return translate('yieldXYZ.entering')
    if (action === 'exit') return translate('yieldXYZ.exiting')
    return translate('common.claiming')
  }, [isQuoteLoading, action, translate, activeStepIndex, transactionSteps])

  const buttonText = useMemo(() => {
    // Use the current step's type/title for a clean button label (e.g., "Delegate", "Undelegate", "Approve")
    if (activeStepIndex >= 0 && transactionSteps[activeStepIndex]) {
      const step = transactionSteps[activeStepIndex]
      return getTransactionButtonText(step.type, step.originalTitle)
    }
    // Before execution starts, use the first CREATED transaction from quoteData
    const firstCreatedTx = quoteData?.transactions?.find(tx => tx.status === 'CREATED')
    if (firstCreatedTx) {
      return getTransactionButtonText(firstCreatedTx.type, firstCreatedTx.title)
    }
    // Fallback to action-based text
    if (action === 'enter') return translate('yieldXYZ.enter')
    if (action === 'exit') return translate('yieldXYZ.exit')
    return translate('common.claim')
  }, [action, translate, activeStepIndex, transactionSteps, quoteData])

  const modalHeading = useMemo(() => {
    if (action === 'enter') return translate('yieldXYZ.enterSymbol', { symbol: assetSymbol })
    if (action === 'exit') return translate('yieldXYZ.exitSymbol', { symbol: assetSymbol })
    return translate('yieldXYZ.claimSymbol', { symbol: assetSymbol })
  }, [action, assetSymbol, translate])

  const successMessage = useMemo(() => {
    if (action === 'enter')
      return translate('yieldXYZ.successEnter', { symbol: assetSymbol, amount })
    if (action === 'exit') return translate('yieldXYZ.successExit', { symbol: assetSymbol, amount })
    return translate('yieldXYZ.successClaim', { symbol: assetSymbol, amount })
  }, [action, assetSymbol, amount, translate])

  const networkAvatarSrc = useMemo(
    () => feeAsset?.networkIcon ?? feeAsset?.icon,
    [feeAsset?.networkIcon, feeAsset?.icon],
  )

  // Show steps from quoteData before execution starts, then switch to actual transactionSteps
  const displaySteps = useMemo((): TransactionStep[] => {
    // If we have transactionSteps (execution has started or completed), use those
    if (transactionSteps.length > 0) {
      return transactionSteps
    }
    // Don't show preview steps while still checking if USDT reset is needed
    if (isAllowanceCheckPending) return []
    // Before execution, create preview steps from quoteData (filter out SKIPPED transactions)
    if (quoteData?.transactions?.length) {
      const steps: TransactionStep[] = []
      // Add reset step if USDT reset is required
      if (isUsdtResetRequired) {
        steps.push({
          title: translate('yieldXYZ.resetAllowance'),
          originalTitle: 'Reset Allowance',
          type: 'RESET',
          status: 'pending' as const,
        })
      }
      // Add yield.xyz transactions
      steps.push(
        ...quoteData.transactions
          .filter(tx => tx.status === 'CREATED')
          .map((tx, i) => ({
            title: formatYieldTxTitle(tx.title || `Transaction ${i + 1}`, assetSymbol),
            originalTitle: tx.title || '',
            type: tx.type,
            status: 'pending' as const,
          })),
      )
      return steps
    }
    return []
  }, [
    transactionSteps,
    quoteData,
    assetSymbol,
    isAllowanceCheckPending,
    isUsdtResetRequired,
    translate,
  ])

  const animatedAvatarRow = useMemo(
    () => (
      <Flex alignItems='center' justify='center' py={6} gap={6} flexDirection={flexDirection}>
        <VStack spacing={2}>
          <Box p={1} bg='background.surface.raised.base' borderRadius='full'>
            <Avatar size='md' src={assetAvatarSrc} icon={walletIcon} />
          </Box>
          <Text fontSize='sm' color='text.subtle' fontWeight='medium'>
            {assetSymbol}
          </Text>
        </VStack>
        <Box position='relative' flex={1} maxW='120px'>
          <Box h='2px' bg='border.base' borderRadius='full' />
          <Box
            position='absolute'
            top='50%'
            left={0}
            right={0}
            h='6px'
            transform='translateY(-50%)'
            opacity={0.6}
            backgroundImage='radial-gradient(circle, var(--chakra-colors-text-subtle) 2px, transparent 2.5px)'
            backgroundSize='14px 100%'
            animation={`${horizontalScroll} 3s infinite linear`}
            style={{
              maskImage: 'linear-gradient(to right, transparent, black 20%, black 80%, transparent)',
              WebkitMaskImage:
                'linear-gradient(to right, transparent, black 20%, black 80%, transparent)',
            }}
          />
        </Box>
        <VStack spacing={2}>
          <Box p={1} bg='background.surface.raised.base' borderRadius='full'>
            <Avatar src={vaultMetadata.logoURI} size='md' name={vaultMetadata.name} icon={checkIconBox} />
          </Box>
          <Text fontSize='sm' color='text.subtle' fontWeight='medium'>
            {vaultMetadata.name}
          </Text>
        </VStack>
      </Flex>
    ),
    [flexDirection, assetAvatarSrc, assetSymbol, horizontalScroll, vaultMetadata.logoURI, vaultMetadata.name],
  )

  const statsContent = useMemo(
    () => (
      <Box bg='background.surface.raised.base' borderRadius='xl' p={4} borderWidth='1px' borderColor='border.base'>
        <Flex justify='space-between' align='center'>
          <Text fontSize='sm' color='text.subtle'>
            {translate('common.amount')}
          </Text>
          <Amount.Crypto value={amount} symbol={assetSymbol} fontSize='sm' fontWeight='medium' />
        </Flex>
        {action === 'enter' && (
          <>
            <Flex justify='space-between' align='center' mt={3}>
              <Text fontSize='sm' color='text.subtle'>
                {translate('yieldXYZ.apr')}
              </Text>
              <GradientApy fontSize='sm' fontWeight='bold'>
                {aprFormatted}
              </GradientApy>
            </Flex>
            {showEstimatedEarnings && (
              <Flex justify='space-between' align='center' mt={3}>
                <Text fontSize='sm' color='text.subtle'>
                  {translate('yieldXYZ.estEarnings')}
                </Text>
                <Flex direction='column' align='flex-end'>
                  <GradientApy fontSize='sm' fontWeight='bold'>
                    {estimatedEarningsAmount}
                  </GradientApy>
                  <Text fontSize='xs' color='text.subtle'>
                    <Amount.Fiat value={estimatedEarningsFiat} />
                  </Text>
                </Flex>
              </Flex>
            )}
          </>
        )}
        {showValidatorRow && (
          <Flex justify='space-between' align='center' mt={3}>
            <Text fontSize='sm' color='text.subtle'>
              {translate('yieldXYZ.validator')}
            </Text>
            <Flex align='center' gap={2}>
              <Avatar size='xs' src={vaultMetadata.logoURI} name={vaultMetadata.name} />
              <Text fontSize='sm' fontWeight='medium'>
                {vaultMetadata.name}
              </Text>
            </Flex>
          </Flex>
        )}
        {!isStaking && (
          <Flex justify='space-between' align='center' mt={3}>
            <Text fontSize='sm' color='text.subtle'>
              {translate('yieldXYZ.provider')}
            </Text>
            <Flex align='center' gap={2}>
              <Avatar size='xs' src={vaultMetadata.logoURI} name={vaultMetadata.name} />
              <Text fontSize='sm' fontWeight='medium'>
                {vaultMetadata.name}
              </Text>
            </Flex>
          </Flex>
        )}
        <Flex justify='space-between' align='center' mt={3}>
          <Text fontSize='sm' color='text.subtle'>
            {translate('yieldXYZ.network')}
          </Text>
          <Flex align='center' gap={2}>
            {feeAsset && <Avatar size='xs' src={networkAvatarSrc} name={yieldItem.network} />}
            <Text fontSize='sm' fontWeight='medium' textTransform='capitalize'>
              {yieldItem.network}
            </Text>
          </Flex>
        </Flex>
      </Box>
    ),
    [
      amount,
      assetSymbol,
      action,
      translate,
      aprFormatted,
      showEstimatedEarnings,
      estimatedEarningsAmount,
      estimatedEarningsFiat,
      showValidatorRow,
      isStaking,
      vaultMetadata.logoURI,
      vaultMetadata.name,
      feeAsset,
      networkAvatarSrc,
      yieldItem.network,
    ],
  )

  const actionContent = useMemo(
    () => (
      <Flex direction='column' gap={4} height='full'>
        {animatedAvatarRow}
        {statsContent}
        <TransactionStepsList steps={displaySteps} />
      </Flex>
    ),
    [animatedAvatarRow, statsContent, displaySteps],
  )

  const { getInstance, fireConfetti, confettiStyle } = useConfetti()

  useEffect(() => {
    if (step === ModalStep.Success) fireConfetti()
  }, [step, fireConfetti])

  const successContent = useMemo(
    () => (
      <VStack spacing={8} py={8} textAlign='center' align='center'>
        <Box
          position='relative'
          w={24}
          h={24}
          borderRadius='full'
          bgGradient='linear(to-br, green.400, green.600)'
          color='text.base'
          display='flex'
          alignItems='center'
          justifyContent='center'
          boxShadow='0 0 30px rgba(72, 187, 120, 0.5)'
          mb={4}
        >
          <Icon as={FaCheck} boxSize={10} />
        </Box>
        <Box>
          <Heading size='xl' mb={3}>
            {translate('yieldXYZ.success')}
          </Heading>
          <Text color='text.subtle' fontSize='lg'>
            {successMessage}
          </Text>
        </Box>
        {vaultMetadata && (
          <Flex
            align='center'
            gap={2}
            bg='background.surface.raised.base'
            px={4}
            py={2}
            borderRadius='full'
          >
            <Avatar size='sm' src={vaultMetadata.logoURI} name={vaultMetadata.name} />
            <Text fontSize='sm' fontWeight='medium'>
              {vaultMetadata.name}
            </Text>
          </Flex>
        )}
        <Box width='full'>
          <VStack spacing={2} align='stretch' mt={4}>
            <Text fontSize='sm' color='text.subtle' textAlign='left' px={1}>
              {translate('yieldXYZ.transactions')}
            </Text>
            {transactionSteps.map((s, idx) => (
              <Flex
                key={idx}
                justify='space-between'
                align='center'
                p={4}
                bg='background.surface.raised.base'
                borderRadius='lg'
                border='1px solid'
                borderColor='border.base'
              >
                <Flex align='center' gap={2}>
                  <Icon as={FaCheck} color='green.400' boxSize={3} />
                  <Text fontSize='sm' fontWeight='medium'>
                    {s.title}
                  </Text>
                </Flex>
                {s.txHash && (
                  <Link
                    href={s.txUrl}
                    isExternal
                    color='blue.400'
                    fontSize='sm'
                    display='flex'
                    alignItems='center'
                    gap={2}
                    _hover={{ textDecor: 'underline' }}
                  >
                    {translate('yieldXYZ.view')} <Icon as={FaExternalLinkAlt} boxSize={3} />
                  </Link>
                )}
              </Flex>
            ))}
          </VStack>
        </Box>
      </VStack>
    ),
    [translate, successMessage, vaultMetadata, transactionSteps],
  )

  const isInProgress = step === ModalStep.InProgress
  const isSuccess = step === ModalStep.Success

  return (
    <>
      <ReactCanvasConfetti onInit={getInstance} style={confettiStyle} />
      <Dialog
        isOpen={isOpen}
        onClose={handleClose}
        isFullScreen
        modalProps={{ closeOnOverlayClick: !isSubmitting }}
      >
        {!isSuccess && (
          <DialogHeader>
            <DialogHeader.Left>{null}</DialogHeader.Left>
            <DialogHeader.Middle>
              <DialogTitle>{modalHeading}</DialogTitle>
            </DialogHeader.Middle>
            <DialogHeader.Right>
              <DialogCloseButton isDisabled={isSubmitting} />
            </DialogHeader.Right>
          </DialogHeader>
        )}
        <DialogBody py={4} flex={1}>
          {isInProgress && actionContent}
          {isSuccess && successContent}
        </DialogBody>
        {isInProgress && (
          <DialogFooter borderTop='1px solid' borderColor='border.base' pt={4} pb={4}>
            <Button
              colorScheme='blue'
              size='lg'
              width='full'
              height='56px'
              fontSize='lg'
              fontWeight='semibold'
              borderRadius='xl'
              isDisabled={isButtonDisabled}
              isLoading={isButtonLoading}
              loadingText={loadingText}
              onClick={handleConfirm}
            >
              {buttonText}
            </Button>
          </DialogFooter>
        )}
        {isSuccess && (
          <DialogFooter borderTop='1px solid' borderColor='border.base' pt={4} pb={4}>
            <Button
              colorScheme='blue'
              size='lg'
              width='full'
              height='56px'
              fontSize='lg'
              fontWeight='semibold'
              borderRadius='xl'
              onClick={handleClose}
            >
              {translate('common.close')}
            </Button>
          </DialogFooter>
        )}
      </Dialog>
    </>
  )
})
