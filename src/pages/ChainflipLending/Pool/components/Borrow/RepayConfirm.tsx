import { ArrowForwardIcon, CheckCircleIcon } from '@chakra-ui/icons'
import {
  Badge,
  Button,
  CardBody,
  CardFooter,
  Divider,
  Flex,
  HStack,
  VStack,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { flipAssetId } from '@shapeshiftoss/caip'
import { useQueryClient } from '@tanstack/react-query'
import { memo, useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { useRepayActionCenter } from './hooks/useRepayActionCenter'
import { useRepayConfirmation } from './hooks/useRepayConfirmation'
import { useRepaySign } from './hooks/useRepaySign'
import { RepayMachineCtx } from './RepayMachineContext'
import { RepayStepper } from './RepayStepper'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import { useModal } from '@/hooks/useModal/useModal'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { reactQueries } from '@/react-queries'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type RepayConfirmProps = {
  assetId: AssetId
}

export const RepayConfirm = memo(({ assetId }: RepayConfirmProps) => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { scAccount } = useChainflipLendingAccount()

  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const { close: closeModal } = useModal('chainflipLending')

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
  useRepayActionCenter()

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
                {translate('chainflipLending.repay.successTitle')}
              </RawText>
              <RawText fontSize='sm' color='text.subtle' textAlign='center'>
                {translate('chainflipLending.repay.successDescription', {
                  amount: repayAmountCryptoPrecision,
                  asset: asset.symbol,
                })}
              </RawText>
            </VStack>
            <Flex
              borderWidth={1}
              borderColor='border.subtle'
              borderRadius='lg'
              p={4}
              width='full'
              direction='column'
              gap={2}
            >
              <Flex justifyContent='space-between' alignItems='center'>
                <RawText fontSize='sm' color='text.subtle'>
                  {translate('chainflipLending.repay.repaid')}
                </RawText>
                <HStack spacing={2}>
                  <Amount.Crypto
                    value={repayAmountCryptoPrecision}
                    symbol={asset.symbol}
                    fontWeight='medium'
                    fontSize='sm'
                  />
                  {isFullRepayment && (
                    <Badge colorScheme='green'>
                      {translate('chainflipLending.repay.fullRepayment')}
                    </Badge>
                  )}
                </HStack>
              </Flex>
            </Flex>
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
              <AssetIcon assetId={assetId} size='md' />
              <ArrowForwardIcon boxSize={5} color='text.subtle' />
              <AssetIcon assetId={flipAssetId} size='md' />
            </HStack>
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

  const isAwaitingNativeConfirm = isNativeWallet && !isConfirming && !stepConfirmed

  if (!isConfirm) {
    return (
      <SlideTransition>
        <CardBody px={6} py={4}>
          <VStack spacing={6} align='center' py={6}>
            <HStack spacing={3}>
              <AssetIcon assetId={assetId} size='md' />
              <ArrowForwardIcon boxSize={5} color='text.subtle' />
              <AssetIcon assetId={flipAssetId} size='md' />
            </HStack>
            {!isAwaitingNativeConfirm && <CircularProgress isIndeterminate />}
            <VStack spacing={2}>
              <RawText fontWeight='bold' fontSize='lg' textAlign='center'>
                {isAwaitingNativeConfirm
                  ? translate('chainflipLending.awaitingConfirmTitle')
                  : translate('chainflipLending.repay.executingTitle')}
              </RawText>
              <RawText fontSize='sm' color='text.subtle' textAlign='center'>
                {isAwaitingNativeConfirm
                  ? translate('chainflipLending.awaitingConfirmDescription')
                  : translate('chainflipLending.repay.executingDescription')}
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
        <VStack spacing={4} align='center' py={4}>
          <AssetIcon assetId={assetId} size='lg' />
          <Amount.Crypto
            value={repayAmountCryptoPrecision}
            symbol={asset.symbol}
            fontWeight='bold'
            fontSize='2xl'
          />
        </VStack>
        <Divider borderColor='border.subtle' />
        <VStack spacing={3} width='full' py={4}>
          <Flex justifyContent='space-between' alignItems='center' width='full'>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('chainflipLending.repay.asset')}
            </RawText>
            <RawText fontSize='sm' fontWeight='medium'>
              {asset.name}
            </RawText>
          </Flex>
          <Flex justifyContent='space-between' alignItems='center' width='full'>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('chainflipLending.repay.amount')}
            </RawText>
            <Amount.Crypto
              value={repayAmountCryptoPrecision}
              symbol={asset.symbol}
              fontSize='sm'
              fontWeight='medium'
            />
          </Flex>
          <Flex justifyContent='space-between' alignItems='center' width='full'>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('chainflipLending.repay.repaymentType')}
            </RawText>
            <HStack spacing={2}>
              <RawText fontSize='sm' fontWeight='medium'>
                {translate(
                  isFullRepayment
                    ? 'chainflipLending.repay.fullRepayment'
                    : 'chainflipLending.repay.partialRepayment',
                )}
              </RawText>
              {isFullRepayment && (
                <Badge colorScheme='green' fontSize='xs'>
                  {translate('chainflipLending.repay.full')}
                </Badge>
              )}
            </HStack>
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
          {translate('chainflipLending.repay.confirmAndRepay')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
})
