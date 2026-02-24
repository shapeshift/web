import { CheckCircleIcon } from '@chakra-ui/icons'
import { Button, CardBody, CardFooter, Flex, VStack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useQueryClient } from '@tanstack/react-query'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { BorrowMachineCtx } from './BorrowMachineContext'
import { BorrowStepper } from './BorrowStepper'
import { useBorrowConfirmation } from './hooks/useBorrowConfirmation'
import { useBorrowSign } from './hooks/useBorrowSign'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { reactQueries } from '@/react-queries'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type BorrowConfirmProps = {
  assetId: AssetId
}

const ltvColorByBps = (bps: number): string => {
  if (bps >= 7500) return 'red.500'
  if (bps >= 5000) return 'yellow.500'
  return 'green.500'
}

export const BorrowConfirm = memo(({ assetId }: BorrowConfirmProps) => {
  const translate = useTranslate()
  const queryClient = useQueryClient()
  const { scAccount } = useChainflipLendingAccount()

  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const actorRef = BorrowMachineCtx.useActorRef()
  const isConfirm = BorrowMachineCtx.useSelector(s => s.matches('confirm'))
  const isSuccess = BorrowMachineCtx.useSelector(s => s.matches('success'))
  const isError = BorrowMachineCtx.useSelector(s => s.matches('error'))
  const borrowAmountCryptoPrecision = BorrowMachineCtx.useSelector(
    s => s.context.borrowAmountCryptoPrecision,
  )
  const projectedLtvBps = BorrowMachineCtx.useSelector(s => s.context.projectedLtvBps)
  const error = BorrowMachineCtx.useSelector(s => s.context.error)
  const isNativeWallet = BorrowMachineCtx.useSelector(s => s.context.isNativeWallet)
  const stepConfirmed = BorrowMachineCtx.useSelector(s => s.context.stepConfirmed)
  const isConfirming = BorrowMachineCtx.useSelector(s => s.matches('confirming'))

  useBorrowSign()
  useBorrowConfirmation()

  const projectedLtvPercent = useMemo(() => (projectedLtvBps / 100).toFixed(1), [projectedLtvBps])

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
                {translate('chainflipLending.borrow.successTitle')}
              </RawText>
              <RawText fontSize='sm' color='text.subtle' textAlign='center'>
                {translate('chainflipLending.borrow.successDescription', {
                  amount: borrowAmountCryptoPrecision,
                  asset: asset.symbol,
                })}
              </RawText>
            </VStack>
            <VStack spacing={1}>
              <RawText fontSize='xs' color='text.subtle'>
                {translate('chainflipLending.borrow.borrowed')}
              </RawText>
              <Amount.Crypto
                value={borrowAmountCryptoPrecision}
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
                {translate('chainflipLending.borrow.errorTitle')}
              </RawText>
              <RawText fontSize='sm' color='text.subtle' textAlign='center'>
                {error ?? translate('chainflipLending.borrow.errorDescription')}
              </RawText>
            </VStack>
            <BorrowStepper />
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
                {translate('chainflipLending.borrow.executingTitle')}
              </RawText>
              <RawText fontSize='sm' color='text.subtle' textAlign='center'>
                {translate('chainflipLending.borrow.executingDescription')}
              </RawText>
            </VStack>
            <BorrowStepper />
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
              {translate('chainflipLending.borrow.confirmTitle')}
            </RawText>
            <RawText fontSize='sm' color='text.subtle' textAlign='center'>
              {translate('chainflipLending.borrow.confirmDescription', {
                amount: borrowAmountCryptoPrecision,
                asset: asset.symbol,
              })}
            </RawText>
          </VStack>
          <Flex direction='column' gap={1} align='center'>
            <Amount.Crypto
              value={borrowAmountCryptoPrecision}
              symbol={asset.symbol}
              fontWeight='bold'
              fontSize='2xl'
            />
            <RawText fontSize='sm' color={ltvColorByBps(projectedLtvBps)}>
              {translate('chainflipLending.borrow.projectedLtv')}: {projectedLtvPercent}%
            </RawText>
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
          {translate('chainflipLending.borrow.confirmAndBorrow')}
        </Button>
        <Button variant='ghost' size='sm' width='full' onClick={handleBack}>
          {translate('common.back')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
})
