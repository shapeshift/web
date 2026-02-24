import { CheckCircleIcon } from '@chakra-ui/icons'
import { Button, CardBody, CardFooter, Flex, VStack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useQueryClient } from '@tanstack/react-query'
import { memo, useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import { useWithdrawBatch } from './hooks/useWithdrawBatch'
import { useWithdrawConfirmation } from './hooks/useWithdrawConfirmation'
import { useWithdrawEgress } from './hooks/useWithdrawEgress'
import { useWithdrawRemove } from './hooks/useWithdrawRemove'
import { WithdrawMachineCtx } from './WithdrawMachineContext'
import { WithdrawStepper } from './WithdrawStepper'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { reactQueries } from '@/react-queries'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type WithdrawConfirmProps = {
  assetId: AssetId
}

export const WithdrawConfirm = memo(({ assetId }: WithdrawConfirmProps) => {
  const translate = useTranslate()
  const queryClient = useQueryClient()
  const { scAccount } = useChainflipLendingAccount()

  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const actorRef = WithdrawMachineCtx.useActorRef()
  const isConfirm = WithdrawMachineCtx.useSelector(s => s.matches('confirm'))
  const isSuccess = WithdrawMachineCtx.useSelector(s => s.matches('success'))
  const isError = WithdrawMachineCtx.useSelector(s => s.matches('error'))
  const withdrawAmountCryptoPrecision = WithdrawMachineCtx.useSelector(
    s => s.context.withdrawAmountCryptoPrecision,
  )
  const error = WithdrawMachineCtx.useSelector(s => s.context.error)
  const isNativeWallet = WithdrawMachineCtx.useSelector(s => s.context.isNativeWallet)
  const stepConfirmed = WithdrawMachineCtx.useSelector(s => s.context.stepConfirmed)
  const isConfirming = WithdrawMachineCtx.useSelector(s => s.matches('confirming'))

  useWithdrawBatch()
  useWithdrawRemove()
  useWithdrawEgress()
  useWithdrawConfirmation()

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
      await queryClient.invalidateQueries(reactQueries.chainflipLending.accountInfo(scAccount))
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
                {translate('chainflipLending.withdraw.successTitle')}
              </RawText>
              <RawText fontSize='sm' color='text.subtle' textAlign='center'>
                {translate('chainflipLending.withdraw.successDescription', {
                  asset: asset.symbol,
                })}
              </RawText>
            </VStack>
            <VStack spacing={1}>
              <RawText fontSize='xs' color='text.subtle'>
                {translate('chainflipLending.withdraw.withdrawn')}
              </RawText>
              <Amount.Crypto
                value={withdrawAmountCryptoPrecision}
                symbol={asset.symbol}
                fontWeight='bold'
                fontSize='lg'
              />
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
                {translate('chainflipLending.withdraw.errorTitle')}
              </RawText>
              <RawText fontSize='sm' color='text.subtle' textAlign='center'>
                {error ?? translate('chainflipLending.withdraw.errorDescription')}
              </RawText>
            </VStack>
            <WithdrawStepper />
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
                {translate('chainflipLending.withdraw.executingTitle')}
              </RawText>
              <RawText fontSize='sm' color='text.subtle' textAlign='center'>
                {translate('chainflipLending.withdraw.executingDescription')}
              </RawText>
            </VStack>
            <WithdrawStepper />
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
              {translate('chainflipLending.withdraw.confirmTitle')}
            </RawText>
            <RawText fontSize='sm' color='text.subtle' textAlign='center'>
              {translate('chainflipLending.withdraw.confirmDescription', {
                amount: withdrawAmountCryptoPrecision,
                asset: asset.symbol,
              })}
            </RawText>
          </VStack>
          <Flex direction='column' gap={1} align='center'>
            <Amount.Crypto
              value={withdrawAmountCryptoPrecision}
              symbol={asset.symbol}
              fontWeight='bold'
              fontSize='2xl'
            />
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
          {translate('chainflipLending.withdraw.confirmAndWithdraw')}
        </Button>
        <Button variant='ghost' size='sm' width='full' onClick={handleBack}>
          {translate('common.back')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
})
