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
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import type { Options } from 'canvas-confetti'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import ReactCanvasConfetti from 'react-canvas-confetti'
import type { TCanvasConfettiInstance } from 'react-canvas-confetti/dist/types'
import { FaCheck, FaExternalLinkAlt, FaWallet } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { GradientApy } from '@/pages/Yields/components/GradientApy'
import { ModalStep, useYieldTransactionFlow } from '@/pages/Yields/hooks/useYieldTransactionFlow'
import { useYieldProviders } from '@/react-queries/queries/yieldxyz/useYieldProviders'
import { useYieldValidators } from '@/react-queries/queries/yieldxyz/useYieldValidators'
import {
  selectFeeAssetByChainId,
  selectMarketDataByAssetIdUserCurrency,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

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

export const YieldActionModal = ({
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
}: YieldActionModalProps) => {
  const translate = useTranslate()
  const modalBg = useColorModeValue('white', 'gray.900')
  const modalBorderColor = useColorModeValue('gray.200', 'gray.700')
  const cardBg = useColorModeValue('gray.50', 'gray.800')
  const cardBorderColor = useColorModeValue('gray.200', 'whiteAlpha.100')
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400')
  const avatarBg = useColorModeValue('gray.100', 'gray.900')

  const {
    step,
    transactionSteps,
    isSubmitting,
    canSubmit,
    handleConfirm,
    handleClose,
    isQuoteLoading,
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

  // Vault Metadata Logic (retained for UI)
  const shouldFetchValidators =
    yieldItem.mechanics.type === 'staking' && yieldItem.mechanics.requiresValidatorSelection

  const { data: validators } = useYieldValidators(yieldItem.id, shouldFetchValidators)

  const { data: providers } = useYieldProviders()
  const marketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, yieldItem.inputTokens[0]?.assetId ?? ''),
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

  // Get network icon from fee asset
  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, yieldItem.chainId ?? ''))

  const horizontalScroll = keyframes`
        0% { background-position: 0 0; }
        100% { background-position: 28px 0; }
        `

  const renderStatusCard = () => (
    <Box
      p={10}
      bg={cardBg}
      borderRadius='2xl'
      borderWidth='1px'
      borderColor={cardBorderColor}
      position='relative'
      overflow='hidden'
      boxShadow='xl'
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
        flexDirection={action === 'enter' ? 'row' : 'row-reverse'}
      >
        <VStack spacing={3} zIndex={2}>
          <Box
            p={1}
            bg={avatarBg}
            borderRadius='full'
            boxShadow='0 0 25px rgba(66, 153, 225, 0.4)'
            position='relative'
            border='2px solid'
            borderColor='blue.500'
          >
            <Avatar
              size='md'
              src={assetLogoURI ?? yieldItem.token.logoURI}
              icon={<FaWallet color='white' />}
            />
          </Box>
          <Text fontSize='sm' color={subtleTextColor} fontWeight='bold'>
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
            bg='whiteAlpha.100'
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
            bg={avatarBg}
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
              icon={
                <Box p={2}>
                  <Icon as={FaCheck} color='white' />
                </Box>
              }
            />
          </Box>
          <Text fontSize='sm' color={subtleTextColor} fontWeight='bold'>
            {vaultMetadata.name}
          </Text>
        </VStack>
      </Flex>

      {/* Info Rows */}
      <VStack align='stretch' spacing={0} mt={4}>
        {/* APR Row - Hide for manage/claim, only show for enter */}
        {action === 'enter' && (
          <>
            <Flex
              justify='space-between'
              align='center'
              py={2}
              borderBottomWidth='1px'
              borderColor='whiteAlpha.100'
            >
              <Text color='gray.400' fontSize='sm'>
                {translate('yieldXYZ.apr')}
              </Text>
              <GradientApy fontSize='sm' fontWeight='bold'>
                {bnOrZero(yieldItem.rewardRate.total).times(100).toFixed(2)}%
              </GradientApy>
            </Flex>
            {/* Estimated Earnings Row */}
            {bnOrZero(amount).gt(0) && (
              <Flex
                justify='space-between'
                align='center'
                py={2}
                borderBottomWidth='1px'
                borderColor='whiteAlpha.100'
              >
                <Text color='gray.400' fontSize='sm'>
                  Est. Earnings
                </Text>
                <Flex align='center' gap={1}>
                  <Flex direction='column' align='flex-end'>
                    <GradientApy fontSize='sm' fontWeight='bold'>
                      {bnOrZero(amount)
                        .times(yieldItem.rewardRate.total)
                        .decimalPlaces(4)
                        .toString()}{' '}
                      {assetSymbol}/yr
                    </GradientApy>
                    <Flex color='gray.500' fontWeight='normal' fontSize='xs'>
                      <Amount.Fiat
                        value={bnOrZero(amount)
                          .times(yieldItem.rewardRate.total)
                          .times(marketData?.price ?? 0)
                          .toString()}
                      />
                    </Flex>
                  </Flex>
                </Flex>
              </Flex>
            )}
          </>
        )}
        {/* Validator Row (only for staking) */}
        {yieldItem.mechanics.type === 'staking' && vaultMetadata.name !== 'Vault' && (
          <Flex
            justify='space-between'
            align='center'
            py={2}
            borderBottomWidth='1px'
            borderColor='whiteAlpha.100'
          >
            <Text color='gray.400' fontSize='sm'>
              Validator
            </Text>
            <Flex align='center' gap={2}>
              <Avatar size='xs' src={vaultMetadata.logoURI} name={vaultMetadata.name} />
              <Text color='white' fontSize='sm' fontWeight='medium'>
                {vaultMetadata.name}
              </Text>
            </Flex>
          </Flex>
        )}
        {/* Provider Row (for non-staking) */}
        {yieldItem.mechanics.type !== 'staking' && (
          <Flex
            justify='space-between'
            align='center'
            py={2}
            borderBottomWidth='1px'
            borderColor='whiteAlpha.100'
          >
            <Text color='gray.400' fontSize='sm'>
              Provider
            </Text>
            <Flex align='center' gap={2}>
              <Avatar size='xs' src={vaultMetadata.logoURI} name={vaultMetadata.name} />
              <Text color='white' fontSize='sm' fontWeight='medium'>
                {vaultMetadata.name}
              </Text>
            </Flex>
          </Flex>
        )}
        {/* Network Row */}
        <Flex justify='space-between' align='center' py={2}>
          <Text color='gray.400' fontSize='sm'>
            Network
          </Text>
          <Flex align='center' gap={2}>
            {feeAsset && (
              <Avatar
                size='xs'
                src={feeAsset.networkIcon ?? feeAsset.icon}
                name={yieldItem.network}
              />
            )}
            <Text color='white' fontSize='sm' fontWeight='medium' textTransform='capitalize'>
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
        {transactionSteps.map((s, idx) => (
          <Flex
            key={idx}
            justify='space-between'
            align='center'
            p={4}
            borderBottomWidth={idx !== transactionSteps.length - 1 ? '1px' : '0'}
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

            {s.status === 'success' && s.txHash ? (
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
  )

  const renderAction = () => (
    <VStack spacing={6} align='stretch'>
      {renderStatusCard()}

      <Button
        size='lg'
        height='64px'
        fontSize='lg'
        colorScheme='blue'
        onClick={handleConfirm}
        width='full'
        borderRadius='xl'
        isDisabled={!canSubmit || isSubmitting || isQuoteLoading}
        isLoading={isSubmitting || isQuoteLoading}
        loadingText={
          isQuoteLoading
            ? translate('yieldXYZ.loadingQuote')
            : action === 'enter'
            ? translate('yieldXYZ.depositing')
            : action === 'exit'
            ? translate('yieldXYZ.withdrawing')
            : translate('common.claiming')
        }
        _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
        transition='all 0.2s'
      >
        {action === 'enter'
          ? translate('yieldXYZ.deposit')
          : action === 'exit'
          ? translate('yieldXYZ.withdraw')
          : translate('common.claim')}
      </Button>
    </VStack>
  )

  // Confetti Logic
  const refAnimationInstance = useRef<TCanvasConfettiInstance | null>(null)
  const getInstance = useCallback(({ confetti }: { confetti: TCanvasConfettiInstance }) => {
    refAnimationInstance.current = confetti
  }, [])

  const makeShot = useCallback((particleRatio: number, opts: Partial<Options>) => {
    if (refAnimationInstance.current) {
      refAnimationInstance.current({
        ...opts,
        origin: { y: 0.7 },
        particleCount: Math.floor(200 * particleRatio),
      })
    }
  }, [])

  const fireConfetti = useCallback(() => {
    makeShot(0.25, {
      spread: 26,
      startVelocity: 55,
    })
    makeShot(0.2, {
      spread: 60,
    })
    makeShot(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    })
    makeShot(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    })
    makeShot(0.1, {
      spread: 120,
      startVelocity: 45,
    })
  }, [makeShot])

  useEffect(() => {
    if (step === ModalStep.Success) {
      fireConfetti()
    }
  }, [step, fireConfetti])

  const renderSuccess = () => (
    <VStack spacing={8} py={8} textAlign='center' align='center'>
      <Box
        position='relative'
        w={24}
        h={24}
        borderRadius='full'
        bgGradient='linear(to-br, green.400, green.600)'
        color='white'
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
          {translate(
            action === 'enter'
              ? 'yieldXYZ.successDeposit'
              : action === 'exit'
              ? 'yieldXYZ.successWithdraw'
              : 'yieldXYZ.successClaim',
            {
              symbol: assetSymbol,
              amount,
            },
          )}
        </Text>
      </Box>

      <Box width='full'>
        <VStack spacing={2} align='stretch' mt={4}>
          <Text fontSize='sm' color='gray.400' textAlign='left' px={1}>
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
              borderColor='whiteAlpha.100'
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
  )

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        isCentered
        size='md'
        closeOnOverlayClick={!isSubmitting}
      >
        <ModalOverlay backdropFilter='blur(12px)' bg='blackAlpha.600' />
        <ModalContent
          bg={modalBg}
          borderColor={modalBorderColor}
          borderWidth='1px'
          borderRadius='3xl'
          boxShadow='2xl'
        >
          <ModalCloseButton top={5} right={5} isDisabled={isSubmitting} />
          <ModalBody p={8}>
            {step !== ModalStep.Success && (
              <Flex alignItems='center' justifyContent='center' mb={8}>
                <Heading size='md' textAlign='center'>
                  {translate(
                    action === 'enter'
                      ? 'yieldXYZ.supplySymbol'
                      : action === 'exit'
                      ? 'yieldXYZ.withdrawSymbol'
                      : 'yieldXYZ.claimSymbol',
                    {
                      symbol: assetSymbol,
                    },
                  )}
                </Heading>
              </Flex>
            )}

            {step === ModalStep.InProgress && renderAction()}
            {step === ModalStep.Success && renderSuccess()}
          </ModalBody>
        </ModalContent>
      </Modal>
      <ReactCanvasConfetti
        onInit={getInstance}
        style={{
          position: 'fixed',
          pointerEvents: 'none',
          width: '100%',
          height: '100%',
          top: 0,
          left: 0,
          zIndex: 9999, // Ensure it's above the modal
        }}
      />
    </>
  )
}
