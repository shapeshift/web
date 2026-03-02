import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons'
import { Button, CardBody, CardFooter, VStack } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { useVoluntaryLiquidationConfirmation } from './hooks/useVoluntaryLiquidationConfirmation'
import { useVoluntaryLiquidationSign } from './hooks/useVoluntaryLiquidationSign'
import { VoluntaryLiquidationMachineCtx } from './VoluntaryLiquidationMachineContext'
import { VoluntaryLiquidationStepper } from './VoluntaryLiquidationStepper'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { reactQueries } from '@/react-queries'

export const VoluntaryLiquidationConfirm = memo(() => {
  const translate = useTranslate()
  const queryClient = useQueryClient()
  const { scAccount } = useChainflipLendingAccount()

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
    actorRef.send({ type: 'DONE' })
  }, [scAccount, queryClient, actorRef])

  const handleBack = useCallback(() => {
    actorRef.send({ type: 'BACK' })
  }, [actorRef])

  if (isSuccess) {
    return (
      <SlideTransition>
        <CardBody px={6} py={4}>
          <VStack spacing={6} align='center' py={6}>
            <CheckCircleIcon boxSize={12} color='green.500' />
            <VStack spacing={2}>
              <RawText fontWeight='bold' fontSize='lg' textAlign='center'>
                {translate(
                  isInitiate
                    ? 'chainflipLending.voluntaryLiquidation.initiateSuccessTitle'
                    : 'chainflipLending.voluntaryLiquidation.stopSuccessTitle',
                )}
              </RawText>
              <RawText fontSize='sm' color='text.subtle' textAlign='center'>
                {translate(
                  isInitiate
                    ? 'chainflipLending.voluntaryLiquidation.initiateSuccessDescription'
                    : 'chainflipLending.voluntaryLiquidation.stopSuccessDescription',
                )}
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

  if (!isConfirm) {
    return (
      <SlideTransition>
        <CardBody px={6} py={4}>
          <VStack spacing={6} align='center' py={6}>
            <CircularProgress isIndeterminate />
            <VStack spacing={2}>
              <RawText fontWeight='bold' fontSize='lg' textAlign='center'>
                {translate('chainflipLending.voluntaryLiquidation.executingTitle')}
              </RawText>
              <RawText fontSize='sm' color='text.subtle' textAlign='center'>
                {translate('chainflipLending.voluntaryLiquidation.executingDescription')}
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

  return (
    <SlideTransition>
      <CardBody px={6} py={4}>
        <VStack spacing={6} align='center' py={6}>
          <WarningIcon boxSize={12} color={isInitiate ? 'red.500' : 'yellow.500'} />
          <VStack spacing={2}>
            <RawText fontWeight='bold' fontSize='lg' textAlign='center'>
              {translate(
                isInitiate
                  ? 'chainflipLending.voluntaryLiquidation.initiateTitle'
                  : 'chainflipLending.voluntaryLiquidation.stopTitle',
              )}
            </RawText>
            <RawText fontSize='sm' color='text.subtle' textAlign='center'>
              {translate(
                isInitiate
                  ? 'chainflipLending.voluntaryLiquidation.initiateWarning'
                  : 'chainflipLending.voluntaryLiquidation.stopDescription',
              )}
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
          colorScheme={isInitiate ? 'red' : 'blue'}
          size='lg'
          height={12}
          borderRadius='xl'
          width='full'
          fontWeight='bold'
          onClick={handleConfirm}
        >
          {translate(
            isInitiate
              ? 'chainflipLending.voluntaryLiquidation.confirmInitiate'
              : 'chainflipLending.voluntaryLiquidation.confirmStop',
          )}
        </Button>
        <Button variant='ghost' size='sm' width='full' onClick={handleBack}>
          {translate('common.back')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
})
