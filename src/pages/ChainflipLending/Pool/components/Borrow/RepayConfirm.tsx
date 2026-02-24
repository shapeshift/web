import { CheckCircleIcon } from '@chakra-ui/icons'
import { Badge, Button, CardBody, CardFooter, Flex, VStack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useQueryClient } from '@tanstack/react-query'
import { memo, useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import { useRepayConfirmation } from './hooks/useRepayConfirmation'
import { useRepaySign } from './hooks/useRepaySign'
import { RepayMachineCtx } from './RepayMachineContext'
import { RepayStepper } from './RepayStepper'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { reactQueries } from '@/react-queries'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type RepayConfirmProps = {
  assetId: AssetId
}

export const RepayConfirm = memo(({ assetId }: RepayConfirmProps) => {
  const translate = useTranslate()
  const queryClient = useQueryClient()
  const { scAccount } = useChainflipLendingAccount()

  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const actorRef = RepayMachineCtx.useActorRef()
  const isConfirm = RepayMachineCtx.useSelector(s => s.matches('confirm'))
  const isSuccess = RepayMachineCtx.useSelector(s => s.matches('success'))
  const isError = RepayMachineCtx.useSelector(s => s.matches('error'))
  const repayAmountCryptoPrecision = RepayMachineCtx.useSelector(
    s => s.context.repayAmountCryptoPrecision,
  )
  const isFullRepayment = RepayMachineCtx.useSelector(s => s.context.isFullRepayment)
  const error = RepayMachineCtx.useSelector(s => s.context.error)
  const isNativeWallet = RepayMachineCtx.useSelector(s => s.context.isNativeWallet)
  const stepConfirmed = RepayMachineCtx.useSelector(s => s.context.stepConfirmed)
  const isConfirming = RepayMachineCtx.useSelector(s => s.matches('confirming'))

  useRepaySign()
  useRepayConfirmation()

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
      await queryClient.invalidateQueries(reactQueries.chainflipLending.freeBalances(scAccount))
      await queryClient.invalidateQueries(reactQueries.chainflipLending.loanAccounts(scAccount))
    }
    actorRef.send({ type: 'DONE' })
  }, [scAccount, queryClient, actorRef])

  const handleBack = useCallback(() => {
    actorRef.send({ type: 'BACK' })
  }, [actorRef])

  if (!asset) return null

  if (isSuccess) {
    return (
      <SlideTransition>
        <CardBody px={6} py={4}>
          <VStack spacing={6} align='center' py={6}>
            <CheckCircleIcon boxSize={12} color='green.500' />
            <VStack spacing={2}>
              <RawText fontWeight='bold' fontSize='lg' textAlign='center'>
                {translate('chainflipLending.repay.successTitle')}
              </RawText>
              <RawText fontSize='sm' color='text.subtle' textAlign='center'>
                {translate('chainflipLending.repay.successDescription', {
                  amount: repayAmountCryptoPrecision,
                  asset: asset.symbol,
                })}
              </RawText>
            </VStack>
            <VStack spacing={1}>
              <RawText fontSize='xs' color='text.subtle'>
                {translate('chainflipLending.repay.repaid')}
              </RawText>
              <Flex alignItems='center' gap={2}>
                <Amount.Crypto
                  value={repayAmountCryptoPrecision}
                  symbol={asset.symbol}
                  fontWeight='bold'
                  fontSize='lg'
                />
                {isFullRepayment && (
                  <Badge colorScheme='green'>
                    {translate('chainflipLending.repay.fullRepayment')}
                  </Badge>
                )}
              </Flex>
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
            <AssetIcon assetId={assetId} size='lg' />
            <VStack spacing={2}>
              <RawText fontWeight='bold' fontSize='lg' textAlign='center' color='red.500'>
                {translate('chainflipLending.repay.errorTitle')}
              </RawText>
              <RawText fontSize='sm' color='text.subtle' textAlign='center'>
                {error ?? translate('chainflipLending.repay.errorDescription')}
              </RawText>
            </VStack>
            <RepayStepper />
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
                {translate('chainflipLending.repay.executingTitle')}
              </RawText>
              <RawText fontSize='sm' color='text.subtle' textAlign='center'>
                {translate('chainflipLending.repay.executingDescription')}
              </RawText>
            </VStack>
            <RepayStepper />
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
          <AssetIcon assetId={assetId} size='lg' />
          <VStack spacing={2}>
            <RawText fontWeight='bold' fontSize='lg' textAlign='center'>
              {translate('chainflipLending.repay.confirmTitle')}
            </RawText>
            <RawText fontSize='sm' color='text.subtle' textAlign='center'>
              {translate('chainflipLending.repay.confirmDescription', {
                amount: repayAmountCryptoPrecision,
                asset: asset.symbol,
              })}
            </RawText>
          </VStack>
          <Flex direction='column' gap={1} align='center'>
            <Amount.Crypto
              value={repayAmountCryptoPrecision}
              symbol={asset.symbol}
              fontWeight='bold'
              fontSize='2xl'
            />
            {isFullRepayment && (
              <Badge colorScheme='blue'>{translate('chainflipLending.repay.fullRepayment')}</Badge>
            )}
          </Flex>
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
          {translate('chainflipLending.repay.confirmAndRepay')}
        </Button>
        <Button variant='ghost' size='sm' width='full' onClick={handleBack}>
          {translate('common.back')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
})
