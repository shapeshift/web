import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons'
import { Box, Button, CardBody, CardFooter, Flex, HStack, VStack } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import { memo, useCallback, useMemo } from 'react'
import { TbShieldHalf } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { useVoluntaryLiquidationConfirmation } from './hooks/useVoluntaryLiquidationConfirmation'
import { useVoluntaryLiquidationSign } from './hooks/useVoluntaryLiquidationSign'
import { VoluntaryLiquidationMachineCtx } from './VoluntaryLiquidationMachineContext'
import { VoluntaryLiquidationStepper } from './VoluntaryLiquidationStepper'

import { Amount } from '@/components/Amount/Amount'
import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import { useModal } from '@/hooks/useModal/useModal'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { useChainflipLoanAccount } from '@/pages/ChainflipLending/hooks/useChainflipLoanAccount'
import { reactQueries } from '@/react-queries'

export const VoluntaryLiquidationConfirm = memo(() => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { scAccount } = useChainflipLendingAccount()
  const { totalCollateralFiat, totalBorrowedFiat, loanAccount } = useChainflipLoanAccount()

  const { close: closeModal } = useModal('chainflipLending')

  const actorRef = VoluntaryLiquidationMachineCtx.useActorRef()
  const isConfirm = VoluntaryLiquidationMachineCtx.useSelector(s => s.matches('confirm'))
  const isSuccess = VoluntaryLiquidationMachineCtx.useSelector(s => s.matches('success'))
  const isError = VoluntaryLiquidationMachineCtx.useSelector(s => s.matches('error'))
  const action = VoluntaryLiquidationMachineCtx.useSelector(s => s.context.action)
  const error = VoluntaryLiquidationMachineCtx.useSelector(s => s.context.error)
  const isNativeWallet = VoluntaryLiquidationMachineCtx.useSelector(s => s.context.isNativeWallet)
  const stepConfirmed = VoluntaryLiquidationMachineCtx.useSelector(s => s.context.stepConfirmed)
  const isConfirming = VoluntaryLiquidationMachineCtx.useSelector(s => s.matches('confirming'))

  useVoluntaryLiquidationSign()
  useVoluntaryLiquidationConfirmation()

  const isInitiate = useMemo(() => action === 'initiate', [action])

  const currentLtvPercent = useMemo(() => {
    if (!loanAccount?.ltv_ratio) return '0.0'
    try {
      const decimal = Number(BigInt(loanAccount.ltv_ratio)) / 1_000_000_000
      return (decimal * 100).toFixed(1)
    } catch {
      return '0.0'
    }
  }, [loanAccount?.ltv_ratio])

  const handleConfirm = useCallback(() => {
    actorRef.send({ type: 'CONFIRM' })
  }, [actorRef])

  const handleConfirmStep = useCallback(() => {
    actorRef.send({ type: 'CONFIRM_STEP' })
  }, [actorRef])

  const handleRetry = useCallback(() => {
    actorRef.send({ type: 'RETRY' })
  }, [actorRef])

  const handleDone = useCallback(async () => {
    if (scAccount) {
      await queryClient.invalidateQueries(reactQueries.chainflipLending.loanAccounts(scAccount))
    }
    closeModal()
  }, [scAccount, queryClient, closeModal])

  const handleViewDashboard = useCallback(async () => {
    await handleDone()
    navigate('/chainflip-lending')
  }, [handleDone, navigate])

  const handleBack = useCallback(() => {
    actorRef.send({ type: 'BACK' })
  }, [actorRef])

  if (isSuccess) {
    if (isInitiate) {
      return (
        <SlideTransition>
          <CardBody px={6} py={4}>
            <VStack spacing={6} align='center' py={4}>
              <CheckCircleIcon boxSize='65px' color='green.500' />
              <VStack spacing={2}>
                <RawText fontWeight='bold' fontSize='lg' textAlign='center'>
                  {translate('chainflipLending.voluntaryLiquidation.initiateSuccessTitle')}
                </RawText>
                <RawText fontSize='sm' color='text.subtle' textAlign='center'>
                  {translate('chainflipLending.voluntaryLiquidation.initiateSuccessDescription')}
                </RawText>
              </VStack>
              <Box
                width='full'
                borderWidth={1}
                borderColor='border.subtle'
                borderRadius='xl'
                bg='background.surface.raised.base'
                px={4}
                py={3}
              >
                <VStack
                  spacing={3}
                  divider={<Box borderBottomWidth={1} borderColor='border.subtle' width='full' />}
                >
                  <Flex width='full' justifyContent='space-between' alignItems='center'>
                    <RawText fontSize='sm' color='text.subtle'>
                      {translate('chainflipLending.voluntaryLiquidation.summaryStatus')}
                    </RawText>
                    <RawText fontSize='sm' fontWeight='medium' color='yellow.500'>
                      {translate('chainflipLending.voluntaryLiquidation.summaryInProgress')}
                    </RawText>
                  </Flex>
                  <Flex width='full' justifyContent='space-between' alignItems='center'>
                    <RawText fontSize='sm' color='text.subtle'>
                      {translate('chainflipLending.voluntaryLiquidation.summaryMethod')}
                    </RawText>
                    <RawText fontSize='sm' fontWeight='medium'>
                      {translate('chainflipLending.voluntaryLiquidation.summaryMethodValue')}
                    </RawText>
                  </Flex>
                  <Flex width='full' justifyContent='space-between' alignItems='center'>
                    <RawText fontSize='sm' color='text.subtle'>
                      {translate('chainflipLending.voluntaryLiquidation.summaryStopsWhen')}
                    </RawText>
                    <RawText fontSize='sm' fontWeight='medium'>
                      {translate('chainflipLending.voluntaryLiquidation.summaryStopsWhenValue')}
                    </RawText>
                  </Flex>
                  <Flex width='full' justifyContent='space-between' alignItems='center'>
                    <RawText fontSize='sm' color='text.subtle'>
                      {translate('chainflipLending.voluntaryLiquidation.summaryUnsoldCollateral')}
                    </RawText>
                    <RawText fontSize='sm' fontWeight='medium'>
                      {translate(
                        'chainflipLending.voluntaryLiquidation.summaryUnsoldCollateralValue',
                      )}
                    </RawText>
                  </Flex>
                </VStack>
              </Box>
            </VStack>
          </CardBody>
          <CardFooter
            borderTopWidth={1}
            borderColor='border.subtle'
            flexDir='column'
            gap={4}
            px={6}
            py={4}
          >
            <HStack width='full' spacing={3}>
              <Button
                variant='ghost'
                size='lg'
                height={12}
                borderRadius='xl'
                flex={1}
                onClick={handleDone}
              >
                {translate('common.close')}
              </Button>
              <Button
                colorScheme='blue'
                size='lg'
                height={12}
                borderRadius='xl'
                flex={1}
                fontWeight='bold'
                onClick={handleViewDashboard}
              >
                {translate('chainflipLending.voluntaryLiquidation.viewDashboard')}
              </Button>
            </HStack>
          </CardFooter>
        </SlideTransition>
      )
    }

    // Stop success - keep simple
    return (
      <SlideTransition>
        <CardBody px={6} py={4}>
          <VStack spacing={6} align='center' py={6}>
            <CheckCircleIcon boxSize={12} color='green.500' />
            <VStack spacing={2}>
              <RawText fontWeight='bold' fontSize='lg' textAlign='center'>
                {translate('chainflipLending.voluntaryLiquidation.stopSuccessTitle')}
              </RawText>
              <RawText fontSize='sm' color='text.subtle' textAlign='center'>
                {translate('chainflipLending.voluntaryLiquidation.stopSuccessDescription')}
              </RawText>
            </VStack>
          </VStack>
        </CardBody>
        <CardFooter
          borderTopWidth={1}
          borderColor='border.subtle'
          flexDir='column'
          gap={4}
          px={6}
          py={4}
        >
          <Button
            colorScheme='blue'
            size='lg'
            height={12}
            borderRadius='xl'
            width='full'
            fontWeight='bold'
            onClick={handleDone}
          >
            {translate('common.done')}
          </Button>
        </CardFooter>
      </SlideTransition>
    )
  }

  if (isError) {
    return (
      <SlideTransition>
        <CardBody px={6} py={4}>
          <VStack spacing={6} align='center' py={6}>
            <WarningIcon boxSize={12} color='red.500' />
            <VStack spacing={2}>
              <RawText fontWeight='bold' fontSize='lg' textAlign='center' color='red.500'>
                {translate('chainflipLending.voluntaryLiquidation.errorTitle')}
              </RawText>
              <RawText fontSize='sm' color='text.subtle' textAlign='center'>
                {error || translate('chainflipLending.voluntaryLiquidation.errorDescription')}
              </RawText>
            </VStack>
            <VoluntaryLiquidationStepper />
          </VStack>
        </CardBody>
        <CardFooter
          borderTopWidth={1}
          borderColor='border.subtle'
          flexDir='column'
          gap={2}
          px={6}
          py={4}
        >
          <Button
            colorScheme='blue'
            size='lg'
            height={12}
            borderRadius='xl'
            width='full'
            fontWeight='bold'
            onClick={handleRetry}
          >
            {translate('common.retry')}
          </Button>
          <Button variant='ghost' size='sm' width='full' onClick={handleBack}>
            {translate('common.back')}
          </Button>
        </CardFooter>
      </SlideTransition>
    )
  }

  const isAwaitingNativeConfirm = isNativeWallet && !isConfirming && !stepConfirmed

  if (!isConfirm) {
    return (
      <SlideTransition>
        <CardBody px={6} py={4}>
          <VStack spacing={6} align='center' py={6}>
            {!isAwaitingNativeConfirm && <CircularProgress isIndeterminate />}
            <VStack spacing={2}>
              <RawText fontWeight='bold' fontSize='lg' textAlign='center'>
                {isAwaitingNativeConfirm
                  ? translate('chainflipLending.awaitingConfirmTitle')
                  : translate('chainflipLending.voluntaryLiquidation.executingTitle')}
              </RawText>
              <RawText fontSize='sm' color='text.subtle' textAlign='center'>
                {isAwaitingNativeConfirm
                  ? translate('chainflipLending.awaitingConfirmDescription')
                  : translate('chainflipLending.voluntaryLiquidation.executingDescription')}
              </RawText>
            </VStack>
            <VoluntaryLiquidationStepper />
          </VStack>
        </CardBody>
        <CardFooter
          borderTopWidth={1}
          borderColor='border.subtle'
          flexDir='column'
          gap={2}
          px={6}
          py={4}
        >
          {isNativeWallet && !isConfirming && (
            <Button
              colorScheme='blue'
              size='lg'
              height={12}
              borderRadius='xl'
              width='full'
              fontWeight='bold'
              onClick={handleConfirmStep}
              isLoading={stepConfirmed}
              isDisabled={stepConfirmed}
            >
              {translate('common.confirm')}
            </Button>
          )}
        </CardFooter>
      </SlideTransition>
    )
  }

  // Initiate confirm - redesigned with shield icon, info rows, and warning
  if (isInitiate) {
    return (
      <SlideTransition>
        <CardBody px={6} py={4}>
          <VStack spacing={5} align='center' py={4}>
            <Box as={TbShieldHalf} boxSize='48px' color='blue.500' />
            <RawText fontWeight='bold' fontSize='lg' textAlign='center'>
              {translate('chainflipLending.voluntaryLiquidation.reduceDebt')}
            </RawText>
            <VStack width='full' spacing={3}>
              <Flex width='full' justifyContent='space-between' alignItems='center'>
                <RawText fontSize='sm' color='text.subtle'>
                  {translate('chainflipLending.voluntaryLiquidation.currentCollateral')}
                </RawText>
                <Amount.Fiat value={totalCollateralFiat} fontSize='sm' fontWeight='medium' />
              </Flex>
              <Flex width='full' justifyContent='space-between' alignItems='center'>
                <RawText fontSize='sm' color='text.subtle'>
                  {translate('chainflipLending.voluntaryLiquidation.outstandingDebt')}
                </RawText>
                <Amount.Fiat value={totalBorrowedFiat} fontSize='sm' fontWeight='medium' />
              </Flex>
              <Flex width='full' justifyContent='space-between' alignItems='center'>
                <RawText fontSize='sm' color='text.subtle'>
                  {translate('chainflipLending.voluntaryLiquidation.currentLtv')}
                </RawText>
                <RawText fontSize='sm' fontWeight='medium'>
                  {currentLtvPercent}%
                </RawText>
              </Flex>
              <Flex width='full' justifyContent='space-between' alignItems='center'>
                <RawText fontSize='sm' color='text.subtle'>
                  {translate('chainflipLending.voluntaryLiquidation.estimatedDuration')}
                </RawText>
                <RawText fontSize='sm' fontWeight='medium'>
                  {translate('chainflipLending.voluntaryLiquidation.estimatedDurationValue')}
                </RawText>
              </Flex>
            </VStack>
            <RawText fontSize='xs' color='text.subtle' textAlign='center' px={2}>
              {translate('chainflipLending.voluntaryLiquidation.initiateWarningDetailed')}
            </RawText>
          </VStack>
        </CardBody>
        <CardFooter
          borderTopWidth={1}
          borderColor='border.subtle'
          flexDir='column'
          gap={4}
          px={6}
          py={4}
        >
          <HStack width='full' spacing={3}>
            <Button
              variant='ghost'
              size='lg'
              height={12}
              borderRadius='xl'
              flex={1}
              onClick={handleBack}
            >
              {translate('common.back')}
            </Button>
            <Button
              colorScheme='red'
              size='lg'
              height={12}
              borderRadius='xl'
              flex={1}
              fontWeight='bold'
              onClick={handleConfirm}
            >
              {translate('chainflipLending.voluntaryLiquidation.confirmLiquidation')}
            </Button>
          </HStack>
        </CardFooter>
      </SlideTransition>
    )
  }

  // Stop confirm - keep existing style
  return (
    <SlideTransition>
      <CardBody px={6} py={4}>
        <VStack spacing={6} align='center' py={6}>
          <WarningIcon boxSize={12} color='yellow.500' />
          <VStack spacing={2}>
            <RawText fontWeight='bold' fontSize='lg' textAlign='center'>
              {translate('chainflipLending.voluntaryLiquidation.stopTitle')}
            </RawText>
            <RawText fontSize='sm' color='text.subtle' textAlign='center'>
              {translate('chainflipLending.voluntaryLiquidation.stopDescription')}
            </RawText>
          </VStack>
        </VStack>
      </CardBody>
      <CardFooter
        borderTopWidth={1}
        borderColor='border.subtle'
        flexDir='column'
        gap={2}
        px={6}
        py={4}
      >
        <Button
          colorScheme='blue'
          size='lg'
          height={12}
          borderRadius='xl'
          width='full'
          fontWeight='bold'
          onClick={handleConfirm}
        >
          {translate('chainflipLending.voluntaryLiquidation.confirmStop')}
        </Button>
        <Button variant='ghost' size='sm' width='full' onClick={handleBack}>
          {translate('common.back')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
})
