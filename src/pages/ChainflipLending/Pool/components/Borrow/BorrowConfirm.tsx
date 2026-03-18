import { ArrowForwardIcon, CheckCircleIcon } from '@chakra-ui/icons'
import { Button, CardBody, CardFooter, Divider, Flex, HStack, VStack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { flipAssetId } from '@shapeshiftoss/caip'
import { useQueryClient } from '@tanstack/react-query'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { BorrowMachineCtx } from './BorrowMachineContext'
import { BorrowStepper } from './BorrowStepper'
import { useBorrowActionCenter } from './hooks/useBorrowActionCenter'
import { useBorrowConfirmation } from './hooks/useBorrowConfirmation'
import { useBorrowSign } from './hooks/useBorrowSign'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import { useModal } from '@/hooks/useModal/useModal'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { useChainflipLtvThresholds } from '@/pages/ChainflipLending/hooks/useChainflipLtvThresholds'
import { reactQueries } from '@/react-queries'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type BorrowConfirmProps = {
  assetId: AssetId
}

export const BorrowConfirm = memo(({ assetId }: BorrowConfirmProps) => {
  const translate = useTranslate()
  const navigate = useNavigate()
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
  const { thresholds } = useChainflipLtvThresholds()
  const { close: closeModal } = useModal('chainflipLending')

  useBorrowSign()
  useBorrowConfirmation()
  useBorrowActionCenter()

  const projectedLtvPercent = useMemo(() => (projectedLtvBps / 100).toFixed(1), [projectedLtvBps])

  const ltvColor = useMemo(() => {
    const decimal = projectedLtvBps / 10000
    if (thresholds) {
      if (decimal >= thresholds.softLiquidation) return 'red.500'
      if (decimal >= thresholds.target) return 'yellow.500'
      return 'green.500'
    }
    if (decimal >= 0.9) return 'red.500'
    if (decimal >= 0.8) return 'yellow.500'
    return 'green.500'
  }, [projectedLtvBps, thresholds])

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
    closeModal()
  }, [scAccount, queryClient, closeModal])

  const handleViewDashboard = useCallback(async () => {
    await handleDone()
    navigate('/chainflip-lending')
  }, [handleDone, navigate])

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
            <VStack spacing={2} width='full' px={2}>
              <Flex justifyContent='space-between' alignItems='center' width='full'>
                <RawText fontSize='sm' color='text.subtle'>
                  {translate('chainflipLending.borrow.borrowed')}
                </RawText>
                <Amount.Crypto
                  value={borrowAmountCryptoPrecision}
                  symbol={asset.symbol}
                  fontWeight='medium'
                  fontSize='sm'
                />
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
          <HStack spacing={3} width='full'>
            <Button
              variant='ghost'
              flex={1}
              size='lg'
              height={12}
              borderRadius='xl'
              onClick={handleDone}
            >
              {translate('common.close')}
            </Button>
            <Button
              colorScheme='blue'
              flex={1}
              size='lg'
              height={12}
              borderRadius='xl'
              fontWeight='bold'
              onClick={handleViewDashboard}
            >
              {translate('chainflipLending.dashboard.viewDashboard')}
            </Button>
          </HStack>
        </CardFooter>
      </SlideTransition>
    )
  }

  if (isError) {
    return (
      <SlideTransition>
        <CardBody px={6} py={4}>
          <VStack spacing={6} align='center' py={6}>
            <HStack spacing={3}>
              <AssetIcon assetId={flipAssetId} size='md' />
              <ArrowForwardIcon boxSize={5} color='text.subtle' />
              <AssetIcon assetId={assetId} size='md' />
            </HStack>
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

  const isAwaitingNativeConfirm = isNativeWallet && !isConfirming && !stepConfirmed

  if (!isConfirm) {
    return (
      <SlideTransition>
        <CardBody px={6} py={4}>
          <VStack spacing={6} align='center' py={6}>
            <HStack spacing={3}>
              <AssetIcon assetId={flipAssetId} size='md' />
              <ArrowForwardIcon boxSize={5} color='text.subtle' />
              <AssetIcon assetId={assetId} size='md' />
            </HStack>
            {!isAwaitingNativeConfirm && <CircularProgress isIndeterminate />}
            <VStack spacing={2}>
              <RawText fontWeight='bold' fontSize='lg' textAlign='center'>
                {isAwaitingNativeConfirm
                  ? translate('chainflipLending.awaitingConfirmTitle')
                  : translate('chainflipLending.borrow.executingTitle')}
              </RawText>
              <RawText fontSize='sm' color='text.subtle' textAlign='center'>
                {isAwaitingNativeConfirm
                  ? translate('chainflipLending.awaitingConfirmDescription')
                  : translate('chainflipLending.borrow.executingDescription')}
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
        <VStack spacing={4} align='center' py={4}>
          <AssetIcon assetId={assetId} size='lg' />
          <Amount.Crypto
            value={borrowAmountCryptoPrecision}
            symbol={asset.symbol}
            fontWeight='bold'
            fontSize='2xl'
          />
        </VStack>
        <Divider borderColor='border.subtle' />
        <VStack spacing={3} width='full' py={4}>
          <Flex justifyContent='space-between' alignItems='center' width='full'>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('chainflipLending.borrow.asset')}
            </RawText>
            <RawText fontSize='sm' fontWeight='medium'>
              {asset.name}
            </RawText>
          </Flex>
          <Flex justifyContent='space-between' alignItems='center' width='full'>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('chainflipLending.borrow.amount')}
            </RawText>
            <Amount.Crypto
              value={borrowAmountCryptoPrecision}
              symbol={asset.symbol}
              fontSize='sm'
              fontWeight='medium'
            />
          </Flex>
          <Flex justifyContent='space-between' alignItems='center' width='full'>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('chainflipLending.borrow.projectedLtv')}
            </RawText>
            <RawText fontSize='sm' fontWeight='medium' color={ltvColor}>
              {projectedLtvPercent}%
            </RawText>
          </Flex>
        </VStack>
      </CardBody>
      <CardFooter
        borderTopWidth={1}
        borderColor='border.subtle'
        flexDir='row'
        gap={3}
        px={6}
        py={4}
      >
        <Button
          variant='ghost'
          flex={1}
          size='lg'
          height={12}
          borderRadius='xl'
          onClick={handleBack}
        >
          {translate('common.back')}
        </Button>
        <Button
          colorScheme='blue'
          flex={1}
          size='lg'
          height={12}
          borderRadius='xl'
          fontWeight='bold'
          onClick={handleConfirm}
        >
          {translate('chainflipLending.borrow.confirmAndBorrow')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
})
