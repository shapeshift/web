import { ArrowForwardIcon, CheckCircleIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { Button, CardBody, CardFooter, Divider, Flex, HStack, Link, VStack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { flipAssetId } from '@shapeshiftoss/caip'
import { useQueryClient } from '@tanstack/react-query'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { EgressMachineCtx } from './EgressMachineContext'
import { EgressStepper } from './EgressStepper'
import { useEgressActionCenter } from './hooks/useEgressActionCenter'
import { useEgressConfirmation } from './hooks/useEgressConfirmation'
import { useEgressSign } from './hooks/useEgressSign'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { InlineCopyButton } from '@/components/InlineCopyButton'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import { useModal } from '@/hooks/useModal/useModal'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { reactQueries } from '@/react-queries'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type EgressConfirmProps = {
  assetId: AssetId
}

export const EgressConfirm = memo(({ assetId }: EgressConfirmProps) => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { scAccount } = useChainflipLendingAccount()
  const { close: closeModal } = useModal('chainflipLending')

  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const actorRef = EgressMachineCtx.useActorRef()
  const isConfirm = EgressMachineCtx.useSelector(s => s.matches('confirm'))
  const isSuccess = EgressMachineCtx.useSelector(s => s.matches('success'))
  const isError = EgressMachineCtx.useSelector(s => s.matches('error'))
  const egressAmountCryptoPrecision = EgressMachineCtx.useSelector(
    s => s.context.egressAmountCryptoPrecision,
  )
  const destinationAddress = EgressMachineCtx.useSelector(s => s.context.destinationAddress)
  const egressTxRef = EgressMachineCtx.useSelector(s => s.context.egressTxRef)
  const error = EgressMachineCtx.useSelector(s => s.context.error)
  const isNativeWallet = EgressMachineCtx.useSelector(s => s.context.isNativeWallet)
  const stepConfirmed = EgressMachineCtx.useSelector(s => s.context.stepConfirmed)
  const isConfirming = EgressMachineCtx.useSelector(s => s.matches('confirming'))

  const egressTxLink = useMemo(() => {
    if (!egressTxRef || !asset?.explorerTxLink) return undefined
    return `${asset.explorerTxLink}${egressTxRef}`
  }, [egressTxRef, asset?.explorerTxLink])

  useEgressSign()
  useEgressConfirmation()
  useEgressActionCenter()

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
                {translate('chainflipLending.egress.successTitle')}
              </RawText>
              <RawText fontSize='sm' color='text.subtle' textAlign='center'>
                {translate('chainflipLending.egress.successDescription', {
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
                  {translate('chainflipLending.egress.withdrawn')}
                </RawText>
                <Amount.Crypto
                  value={egressAmountCryptoPrecision}
                  symbol={asset.symbol}
                  fontWeight='medium'
                  fontSize='sm'
                />
              </Flex>
              {egressTxRef && (
                <Flex justifyContent='space-between' alignItems='center'>
                  <RawText fontSize='sm' color='text.subtle'>
                    {translate('chainflipLending.egress.transactionId')}
                  </RawText>
                  {egressTxLink ? (
                    <Link href={egressTxLink} isExternal color='text.link' fontSize='sm'>
                      <HStack spacing={1}>
                        <MiddleEllipsis value={egressTxRef} />
                        <ExternalLinkIcon />
                      </HStack>
                    </Link>
                  ) : (
                    <RawText fontSize='sm'>
                      <MiddleEllipsis value={egressTxRef} />
                    </RawText>
                  )}
                </Flex>
              )}
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
              <AssetIcon assetId={flipAssetId} size='md' />
              <ArrowForwardIcon boxSize={5} color='text.subtle' />
              <AssetIcon assetId={assetId} size='md' />
            </HStack>
            <VStack spacing={2}>
              <RawText fontWeight='bold' fontSize='lg' textAlign='center' color='red.500'>
                {translate('chainflipLending.egress.errorTitle')}
              </RawText>
              <RawText fontSize='sm' color='text.subtle' textAlign='center'>
                {error ?? translate('chainflipLending.egress.errorDescription')}
              </RawText>
            </VStack>
            <EgressStepper />
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
                  : translate('chainflipLending.egress.executingTitle')}
              </RawText>
              <RawText fontSize='sm' color='text.subtle' textAlign='center'>
                {isAwaitingNativeConfirm
                  ? translate('chainflipLending.awaitingConfirmDescription')
                  : translate('chainflipLending.egress.executingDescription')}
              </RawText>
            </VStack>
            <EgressStepper />
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
            value={egressAmountCryptoPrecision}
            symbol={asset.symbol}
            fontWeight='bold'
            fontSize='2xl'
          />
        </VStack>
        <Divider borderColor='border.subtle' />
        <VStack spacing={3} width='full' py={4}>
          <Flex justifyContent='space-between' alignItems='center' width='full'>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('chainflipLending.egress.asset')}
            </RawText>
            <RawText fontSize='sm' fontWeight='medium'>
              {asset.name}
            </RawText>
          </Flex>
          <Flex justifyContent='space-between' alignItems='center' width='full'>
            <RawText fontSize='sm' color='text.subtle'>
              {translate('chainflipLending.egress.amount')}
            </RawText>
            <Amount.Crypto
              value={egressAmountCryptoPrecision}
              symbol={asset.symbol}
              fontSize='sm'
              fontWeight='medium'
            />
          </Flex>
          {destinationAddress && (
            <Flex justifyContent='space-between' alignItems='center' width='full'>
              <RawText fontSize='sm' color='text.subtle'>
                {translate('chainflipLending.egress.receiveAddress')}
              </RawText>
              <InlineCopyButton value={destinationAddress}>
                <RawText fontSize='sm' fontWeight='medium' color='text.subtle'>
                  <MiddleEllipsis value={destinationAddress} />
                </RawText>
              </InlineCopyButton>
            </Flex>
          )}
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
          {translate('chainflipLending.egress.confirmAndWithdraw')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
})
