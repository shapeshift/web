import { CheckCircleIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { Button, CardBody, CardFooter, Flex, Link, VStack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useQueryClient } from '@tanstack/react-query'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { EgressMachineCtx } from './EgressMachineContext'
import { EgressStepper } from './EgressStepper'
import { useEgressConfirmation } from './hooks/useEgressConfirmation'
import { useEgressSign } from './hooks/useEgressSign'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
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
            <VStack spacing={1}>
              <RawText fontSize='xs' color='text.subtle'>
                {translate('chainflipLending.egress.withdrawn')}
              </RawText>
              <Amount.Crypto
                value={egressAmountCryptoPrecision}
                symbol={asset.symbol}
                fontWeight='bold'
                fontSize='lg'
              />
            </VStack>
            {egressTxRef && (
              <VStack spacing={1}>
                <RawText fontSize='xs' color='text.subtle'>
                  {translate('chainflipLending.egress.transactionId')}
                </RawText>
                {egressTxLink ? (
                  <Link href={egressTxLink} isExternal color='text.link' fontSize='sm'>
                    <MiddleEllipsis value={egressTxRef} />
                    <ExternalLinkIcon mx={1} />
                  </Link>
                ) : (
                  <RawText fontSize='sm'>
                    <MiddleEllipsis value={egressTxRef} />
                  </RawText>
                )}
              </VStack>
            )}
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

  if (!isConfirm) {
    return (
      <SlideTransition>
        <CardBody px={6} py={4}>
          <VStack spacing={6} align='center' py={6}>
            <CircularProgress isIndeterminate />
            <VStack spacing={2}>
              <RawText fontWeight='bold' fontSize='lg' textAlign='center'>
                {translate('chainflipLending.egress.executingTitle')}
              </RawText>
              <RawText fontSize='sm' color='text.subtle' textAlign='center'>
                {translate('chainflipLending.egress.executingDescription')}
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
        <VStack spacing={6} align='center' py={6}>
          <AssetIcon assetId={assetId} size='lg' />
          <VStack spacing={2}>
            <RawText fontWeight='bold' fontSize='lg' textAlign='center'>
              {translate('chainflipLending.egress.confirmTitle')}
            </RawText>
            <RawText fontSize='sm' color='text.subtle' textAlign='center'>
              {translate('chainflipLending.egress.confirmDescription', {
                amount: egressAmountCryptoPrecision,
                asset: asset.symbol,
              })}
            </RawText>
          </VStack>
          <Flex direction='column' gap={1} align='center'>
            <Amount.Crypto
              value={egressAmountCryptoPrecision}
              symbol={asset.symbol}
              fontWeight='bold'
              fontSize='2xl'
            />
            <RawText fontSize='xs' color='text.subtle' textAlign='center' wordBreak='break-all'>
              {destinationAddress}
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
          {translate('chainflipLending.egress.confirmAndWithdraw')}
        </Button>
        <Button variant='ghost' size='sm' width='full' onClick={handleBack}>
          {translate('common.back')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
})
