import { ArrowForwardIcon, CheckCircleIcon } from '@chakra-ui/icons'
import { Box, Button, CardBody, CardFooter, Divider, Flex, HStack, VStack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { flipAssetId } from '@shapeshiftoss/caip'
import { useQueryClient } from '@tanstack/react-query'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { useSupplyActionCenter } from './hooks/useSupplyActionCenter'
import { useSupplyConfirmation } from './hooks/useSupplyConfirmation'
import { useSupplySign } from './hooks/useSupplySign'
import { SupplyMachineCtx } from './SupplyMachineContext'
import { SupplyStepper } from './SupplyStepper'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import { useModal } from '@/hooks/useModal/useModal'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { useChainflipLendingPools } from '@/pages/ChainflipLending/hooks/useChainflipLendingPools'
import { reactQueries } from '@/react-queries'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type SupplyConfirmProps = {
  assetId: AssetId
}

export const SupplyConfirm = memo(({ assetId }: SupplyConfirmProps) => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { scAccount } = useChainflipLendingAccount()
  const { close: closeModal } = useModal('chainflipLending')

  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const actorRef = SupplyMachineCtx.useActorRef()
  const isConfirm = SupplyMachineCtx.useSelector(s => s.matches('confirm'))
  const isSuccess = SupplyMachineCtx.useSelector(s => s.matches('success'))
  const isError = SupplyMachineCtx.useSelector(s => s.matches('error'))
  const supplyAmountCryptoPrecision = SupplyMachineCtx.useSelector(
    s => s.context.supplyAmountCryptoPrecision,
  )
  const error = SupplyMachineCtx.useSelector(s => s.context.error)
  const isNativeWallet = SupplyMachineCtx.useSelector(s => s.context.isNativeWallet)
  const stepConfirmed = SupplyMachineCtx.useSelector(s => s.context.stepConfirmed)
  const isConfirming = SupplyMachineCtx.useSelector(s => s.matches('confirming'))

  const { pools } = useChainflipLendingPools()

  const supplyApyPercent = useMemo(() => {
    const pool = pools.find(p => p.assetId === assetId)
    return pool ? bnOrZero(pool.supplyApy).times(100).toFixed(2) : null
  }, [pools, assetId])

  useSupplySign()
  useSupplyConfirmation()
  useSupplyActionCenter()

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
    closeModal()
  }, [scAccount, queryClient, actorRef, closeModal])

  const handleViewDashboard = useCallback(() => {
    closeModal()
    navigate('/chainflip-lending')
  }, [closeModal, navigate])

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
                {translate('chainflipLending.supply.successTitle')}
              </RawText>
              <RawText fontSize='sm' color='text.subtle' textAlign='center'>
                {translate('chainflipLending.supply.successDescription', {
                  asset: asset.symbol,
                })}
              </RawText>
            </VStack>
            <VStack spacing={2} width='full' px={2}>
              <Flex justifyContent='space-between' alignItems='center' width='full'>
                <RawText fontSize='sm' color='text.subtle'>
                  {translate('chainflipLending.supply.supplied')}
                </RawText>
                <Amount.Crypto
                  value={supplyAmountCryptoPrecision}
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
              <AssetIcon assetId={assetId} size='md' />
              <ArrowForwardIcon boxSize={5} color='text.subtle' />
              <AssetIcon assetId={flipAssetId} size='md' />
            </HStack>
            <VStack spacing={2}>
              <RawText fontWeight='bold' fontSize='lg' textAlign='center' color='red.500'>
                {translate('chainflipLending.supply.errorTitle')}
              </RawText>
              <RawText fontSize='sm' color='text.subtle' textAlign='center'>
                {error ?? translate('chainflipLending.supply.errorDescription')}
              </RawText>
            </VStack>
            <SupplyStepper />
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
                  : translate('chainflipLending.supply.executingTitle')}
              </RawText>
              <RawText fontSize='sm' color='text.subtle' textAlign='center'>
                {isAwaitingNativeConfirm
                  ? translate('chainflipLending.awaitingConfirmDescription')
                  : translate('chainflipLending.supply.executingDescription')}
              </RawText>
            </VStack>
            <SupplyStepper />
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
          <Box
            borderWidth={1}
            borderColor='border.base'
            borderRadius='xl'
            px={6}
            py={4}
            width='full'
            display='flex'
            flexDirection='column'
            alignItems='center'
            gap={3}
          >
            <AssetIcon assetId={assetId} size='lg' />
            <Amount.Crypto
              value={supplyAmountCryptoPrecision}
              symbol={asset.symbol}
              fontWeight='bold'
              fontSize='2xl'
            />
          </Box>
        </VStack>
        <Divider borderColor='border.subtle' />
        <VStack spacing={3} width='full' py={4}>
          <Flex justifyContent='space-between' alignItems='center' width='full'>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('chainflipLending.supply.asset')}
            </RawText>
            <Flex alignItems='center' gap={2}>
              <AssetIcon assetId={assetId} size='xs' />
              <RawText fontSize='sm' fontWeight='medium'>
                {asset.symbol}
              </RawText>
            </Flex>
          </Flex>
          <Flex justifyContent='space-between' alignItems='center' width='full'>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('chainflipLending.supply.amount')}
            </RawText>
            <Amount.Crypto
              value={supplyAmountCryptoPrecision}
              symbol={asset.symbol}
              fontSize='sm'
              fontWeight='medium'
            />
          </Flex>
          {supplyApyPercent !== null && (
            <Flex justifyContent='space-between' alignItems='center' width='full'>
              <RawText fontSize='sm' color='text.subtle'>
                {translate('chainflipLending.supply.poolApy')}
              </RawText>
              <RawText fontSize='sm' fontWeight='medium' color='green.500'>
                {supplyApyPercent}%
              </RawText>
            </Flex>
          )}
          <Flex justifyContent='space-between' alignItems='center' width='full'>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('chainflipLending.supply.destination')}
            </RawText>
            <RawText fontSize='sm' fontWeight='medium'>
              {translate('chainflipLending.supply.lendingPool', { asset: asset.symbol })}
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
          {translate('chainflipLending.supply.confirmAndSupply')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
})
