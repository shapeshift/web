import {
  Avatar,
  Box,
  Button,
  Flex,
  Heading,
  Icon,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import { memo, useEffect, useMemo } from 'react'
import ReactCanvasConfetti from 'react-canvas-confetti'
import { FaCheck, FaExternalLinkAlt, FaWallet } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { formatYieldTxTitle, getTransactionButtonText } from '@/lib/yieldxyz/utils'
import { GradientApy } from '@/pages/Yields/components/GradientApy'
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
    () => isSubmitting || isQuoteLoading,
    [isSubmitting, isQuoteLoading],
  )

  const loadingText = useMemo(() => {
    if (isQuoteLoading) return translate('yieldXYZ.loadingQuote')
    // Use the current step's loading message if available
    if (activeStepIndex >= 0 && transactionSteps[activeStepIndex]?.loadingMessage) {
      return transactionSteps[activeStepIndex].loadingMessage
    }
    if (action === 'enter') return translate('yieldXYZ.depositing')
    if (action === 'exit') return translate('yieldXYZ.withdrawing')
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
    if (action === 'enter') return translate('yieldXYZ.deposit')
    if (action === 'exit') return translate('yieldXYZ.withdraw')
    return translate('common.claim')
  }, [action, translate, activeStepIndex, transactionSteps, quoteData])

  const modalHeading = useMemo(() => {
    if (action === 'enter') return translate('yieldXYZ.supplySymbol', { symbol: assetSymbol })
    if (action === 'exit') return translate('yieldXYZ.withdrawSymbol', { symbol: assetSymbol })
    return translate('yieldXYZ.claimSymbol', { symbol: assetSymbol })
  }, [action, assetSymbol, translate])

  const successMessage = useMemo(() => {
    if (action === 'enter')
      return translate('yieldXYZ.successDeposit', { symbol: assetSymbol, amount })
    if (action === 'exit')
      return translate('yieldXYZ.successWithdraw', { symbol: assetSymbol, amount })
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
    // Before execution, create preview steps from quoteData (filter out SKIPPED transactions)
    if (quoteData?.transactions?.length) {
      return quoteData.transactions
        .filter(tx => tx.status === 'CREATED')
        .map((tx, i) => ({
          title: formatYieldTxTitle(tx.title || `Transaction ${i + 1}`, assetSymbol),
          originalTitle: tx.title || '',
          type: tx.type,
          status: 'pending' as const,
        }))
    }
    return []
  }, [transactionSteps, quoteData, assetSymbol])

  const statusCard = useMemo(
    () => (
      <Box
        p={10}
        bg='background.surface.raised.base'
        borderRadius='2xl'
        borderWidth='1px'
        borderColor='border.base'
        position='relative'
        overflow='hidden'
        minH='200px'
      >
        <Box
          position='absolute'
          top='0'
          left='20%'
          right='20%'
          h='1px'
          bgGradient='linear(to-r, transparent, blue.500, transparent)'
          boxShadow='0 0 20px 2px rgba(66, 153, 225, 0.5)'
        />
        <Flex justify='space-between' align='center' mb={6}>
          <Amount.Crypto value={amount} symbol={assetSymbol} size='2xl' fontWeight='bold' />
        </Flex>
        <Flex
          alignItems='center'
          justify='center'
          mb={8}
          py={4}
          position='relative'
          gap={10}
          flexDirection={flexDirection}
        >
          <VStack spacing={3} zIndex={2}>
            <Box
              p={1}
              bg='background.surface.base'
              borderRadius='full'
              boxShadow='0 0 25px rgba(66, 153, 225, 0.4)'
              position='relative'
              border='2px solid'
              borderColor='blue.500'
            >
              <Avatar size='md' src={assetAvatarSrc} icon={walletIcon} />
            </Box>
            <Text fontSize='sm' color='text.subtle' fontWeight='bold'>
              {assetSymbol}
            </Text>
          </VStack>
          <Box
            position='relative'
            flex={1}
            h='50px'
            display='flex'
            alignItems='center'
            justifyContent='center'
          >
            <Box
              position='absolute'
              left={0}
              right={0}
              h='2px'
              bg='border.base'
              borderRadius='full'
            />
            <Box
              position='absolute'
              left={0}
              right={0}
              h='6px'
              opacity={0.8}
              backgroundImage='radial-gradient(circle, #4299E1 2px, transparent 2.5px)'
              backgroundSize='14px 100%'
              animation={`${horizontalScroll} 3s infinite linear`}
              style={{
                maskImage:
                  'linear-gradient(to right, transparent, black 20%, black 80%, transparent)',
                WebkitMaskImage:
                  'linear-gradient(to right, transparent, black 20%, black 80%, transparent)',
              }}
            />
          </Box>
          <VStack spacing={3} zIndex={2} position='relative'>
            <Box
              position='relative'
              p={1}
              bg='background.surface.base'
              borderRadius='full'
              border='2px solid'
              borderColor='blue.500'
              boxShadow='0 0 25px rgba(66, 153, 225, 0.2)'
              backgroundClip='padding-box'
            >
              <Avatar
                src={vaultMetadata.logoURI}
                size='md'
                name={vaultMetadata.name}
                icon={checkIconBox}
              />
            </Box>
            <Text fontSize='sm' color='text.subtle' fontWeight='bold'>
              {vaultMetadata.name}
            </Text>
          </VStack>
        </Flex>
        <VStack align='stretch' spacing={0} mt={4}>
          {action === 'enter' && (
            <>
              <Flex
                justify='space-between'
                align='center'
                py={2}
                borderBottomWidth='1px'
                borderColor='border.base'
              >
                <Text color='text.subtle' fontSize='sm'>
                  {translate('yieldXYZ.apr')}
                </Text>
                <GradientApy fontSize='sm' fontWeight='bold'>
                  {aprFormatted}
                </GradientApy>
              </Flex>
              {showEstimatedEarnings && (
                <Flex
                  justify='space-between'
                  align='center'
                  py={2}
                  borderBottomWidth='1px'
                  borderColor='border.base'
                >
                  <Text color='text.subtle' fontSize='sm'>
                    {translate('yieldXYZ.estEarnings')}
                  </Text>
                  <Flex align='center' gap={1}>
                    <Flex direction='column' align='flex-end'>
                      <GradientApy fontSize='sm' fontWeight='bold'>
                        {estimatedEarningsAmount}
                      </GradientApy>
                      <Flex color='gray.500' fontWeight='normal' fontSize='xs'>
                        <Amount.Fiat value={estimatedEarningsFiat} />
                      </Flex>
                    </Flex>
                  </Flex>
                </Flex>
              )}
            </>
          )}
          {showValidatorRow && (
            <Flex
              justify='space-between'
              align='center'
              py={2}
              borderBottomWidth='1px'
              borderColor='border.base'
            >
              <Text color='text.subtle' fontSize='sm'>
                {translate('yieldXYZ.validator')}
              </Text>
              <Flex align='center' gap={2}>
                <Avatar size='xs' src={vaultMetadata.logoURI} name={vaultMetadata.name} />
                <Text color='text.base' fontSize='sm' fontWeight='medium'>
                  {vaultMetadata.name}
                </Text>
              </Flex>
            </Flex>
          )}
          {!isStaking && (
            <Flex
              justify='space-between'
              align='center'
              py={2}
              borderBottomWidth='1px'
              borderColor='border.base'
            >
              <Text color='text.subtle' fontSize='sm'>
                {translate('yieldXYZ.provider')}
              </Text>
              <Flex align='center' gap={2}>
                <Avatar size='xs' src={vaultMetadata.logoURI} name={vaultMetadata.name} />
                <Text color='text.base' fontSize='sm' fontWeight='medium'>
                  {vaultMetadata.name}
                </Text>
              </Flex>
            </Flex>
          )}
          <Flex justify='space-between' align='center' py={2}>
            <Text color='text.subtle' fontSize='sm'>
              {translate('yieldXYZ.network')}
            </Text>
            <Flex align='center' gap={2}>
              {feeAsset && <Avatar size='xs' src={networkAvatarSrc} name={yieldItem.network} />}
              <Text color='text.base' fontSize='sm' fontWeight='medium' textTransform='capitalize'>
                {yieldItem.network}
              </Text>
            </Flex>
          </Flex>
        </VStack>
        <VStack
          align='stretch'
          spacing={0}
          bg='blackAlpha.300'
          borderRadius='xl'
          overflow='hidden'
          mt={4}
        >
          {displaySteps.map((s, idx) => (
            <Flex
              key={idx}
              justify='space-between'
              align='center'
              p={4}
              borderBottomWidth={idx !== displaySteps.length - 1 ? '1px' : '0'}
              borderColor='whiteAlpha.50'
              bg={s.status === 'loading' ? 'whiteAlpha.50' : 'transparent'}
              transition='all 0.2s'
            >
              <Flex align='center' gap={3}>
                {s.status === 'success' ? (
                  <Icon as={FaCheck} color='green.400' boxSize={4} />
                ) : s.status === 'loading' ? (
                  <Spinner size='xs' color='blue.400' />
                ) : (
                  <Box w={2} h={2} bg='gray.600' borderRadius='full' ml={1} />
                )}
                <Text
                  color={s.status === 'pending' ? 'gray.500' : 'white'}
                  fontSize='sm'
                  fontWeight={s.status === 'loading' ? 'bold' : 'medium'}
                >
                  {s.title}
                </Text>
              </Flex>
              {s.txHash ? (
                <Link
                  href={s.txUrl}
                  isExternal
                  color='blue.400'
                  fontSize='xs'
                  display='flex'
                  alignItems='center'
                  gap={1}
                  _hover={{ textDecoration: 'underline' }}
                >
                  <MiddleEllipsis value={s.txHash} /> <Icon as={FaExternalLinkAlt} boxSize={3} />
                </Link>
              ) : (
                <Text
                  fontSize='xs'
                  color={s.status === 'loading' ? 'blue.300' : 'gray.600'}
                  fontWeight='medium'
                >
                  {s.status === 'success'
                    ? translate('yieldXYZ.loading.done')
                    : s.status === 'loading'
                    ? ''
                    : translate('yieldXYZ.loading.waiting')}
                </Text>
              )}
            </Flex>
          ))}
        </VStack>
      </Box>
    ),
    [
      amount,
      assetSymbol,
      flexDirection,
      assetAvatarSrc,
      horizontalScroll,
      vaultMetadata.logoURI,
      vaultMetadata.name,
      action,
      translate,
      aprFormatted,
      showEstimatedEarnings,
      estimatedEarningsAmount,
      estimatedEarningsFiat,
      showValidatorRow,
      isStaking,
      feeAsset,
      networkAvatarSrc,
      yieldItem.network,
      displaySteps,
    ],
  )

  const actionContent = useMemo(
    () => (
      <VStack spacing={6} align='stretch'>
        {statusCard}
        <Button
          size='lg'
          height='64px'
          fontSize='lg'
          colorScheme='blue'
          onClick={handleConfirm}
          width='full'
          borderRadius='xl'
          isDisabled={isButtonDisabled}
          isLoading={isButtonLoading}
          loadingText={loadingText}
          _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
          transition='all 0.2s'
        >
          {buttonText}
        </Button>
      </VStack>
    ),
    [statusCard, handleConfirm, isButtonDisabled, isButtonLoading, loadingText, buttonText],
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
                bg='whiteAlpha.50'
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
        <Button
          size='lg'
          colorScheme='gray'
          width='full'
          onClick={handleClose}
          borderRadius='xl'
          height='64px'
        >
          {translate('yieldXYZ.close')}
        </Button>
      </VStack>
    ),
    [translate, successMessage, transactionSteps, handleClose],
  )

  const isNotSuccess = useMemo(() => step !== ModalStep.Success, [step])
  const isInProgress = useMemo(() => step === ModalStep.InProgress, [step])
  const isSuccess = useMemo(() => step === ModalStep.Success, [step])

  const headerContent = useMemo(() => {
    if (!isNotSuccess) return null
    return (
      <Flex alignItems='center' justifyContent='center' mb={8}>
        <Heading size='md' textAlign='center'>
          {modalHeading}
        </Heading>
      </Flex>
    )
  }, [isNotSuccess, modalHeading])

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        isCentered
        size='md'
        closeOnOverlayClick={!isSubmitting}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton top={5} right={5} isDisabled={isSubmitting} />
          <ModalBody p={8}>
            {headerContent}
            {isInProgress && actionContent}
            {isSuccess && successContent}
          </ModalBody>
        </ModalContent>
      </Modal>
      <ReactCanvasConfetti onInit={getInstance} style={confettiStyle} />
    </>
  )
})
