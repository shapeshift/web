import { CheckCircleIcon } from '@chakra-ui/icons'
import { Button, CardBody, CardFooter, Flex, VStack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useQueryClient } from '@tanstack/react-query'
import { memo, useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import { CollateralMachineCtx } from './CollateralMachineContext'
import { CollateralStepper } from './CollateralStepper'
import { useCollateralConfirmation } from './hooks/useCollateralConfirmation'
import { useCollateralSign } from './hooks/useCollateralSign'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { reactQueries } from '@/react-queries'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type CollateralConfirmProps = {
  assetId: AssetId
}

export const CollateralConfirm = memo(({ assetId }: CollateralConfirmProps) => {
  const translate = useTranslate()
  const queryClient = useQueryClient()
  const { scAccount } = useChainflipLendingAccount()

  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const actorRef = CollateralMachineCtx.useActorRef()
  const isConfirm = CollateralMachineCtx.useSelector(s => s.matches('confirm'))
  const isSuccess = CollateralMachineCtx.useSelector(s => s.matches('success'))
  const isError = CollateralMachineCtx.useSelector(s => s.matches('error'))
  const mode = CollateralMachineCtx.useSelector(s => s.context.mode)
  const collateralAmountCryptoPrecision = CollateralMachineCtx.useSelector(
    s => s.context.collateralAmountCryptoPrecision,
  )
  const error = CollateralMachineCtx.useSelector(s => s.context.error)
  const isNativeWallet = CollateralMachineCtx.useSelector(s => s.context.isNativeWallet)
  const stepConfirmed = CollateralMachineCtx.useSelector(s => s.context.stepConfirmed)
  const isConfirming = CollateralMachineCtx.useSelector(s => s.matches('confirming'))

  useCollateralSign()
  useCollateralConfirmation()

  const isAddMode = mode === 'add'

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
                {translate(
                  isAddMode
                    ? 'chainflipLending.collateral.successAddTitle'
                    : 'chainflipLending.collateral.successRemoveTitle',
                )}
              </RawText>
              <RawText fontSize='sm' color='text.subtle' textAlign='center'>
                {translate(
                  isAddMode
                    ? 'chainflipLending.collateral.successAddDescription'
                    : 'chainflipLending.collateral.successRemoveDescription',
                  { asset: asset.symbol },
                )}
              </RawText>
            </VStack>
            <VStack spacing={1}>
              <RawText fontSize='xs' color='text.subtle'>
                {translate(
                  isAddMode
                    ? 'chainflipLending.collateral.added'
                    : 'chainflipLending.collateral.removed',
                )}
              </RawText>
              <Amount.Crypto
                value={collateralAmountCryptoPrecision}
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
                {translate('chainflipLending.collateral.errorTitle')}
              </RawText>
              <RawText fontSize='sm' color='text.subtle' textAlign='center'>
                {error ?? translate('chainflipLending.collateral.errorDescription')}
              </RawText>
            </VStack>
            <CollateralStepper />
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
                {translate('chainflipLending.collateral.executingTitle')}
              </RawText>
              <RawText fontSize='sm' color='text.subtle' textAlign='center'>
                {translate('chainflipLending.collateral.executingDescription')}
              </RawText>
            </VStack>
            <CollateralStepper />
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
              {translate(
                isAddMode
                  ? 'chainflipLending.collateral.confirmAddTitle'
                  : 'chainflipLending.collateral.confirmRemoveTitle',
              )}
            </RawText>
            <RawText fontSize='sm' color='text.subtle' textAlign='center'>
              {translate(
                isAddMode
                  ? 'chainflipLending.collateral.confirmAddDescription'
                  : 'chainflipLending.collateral.confirmRemoveDescription',
                {
                  amount: collateralAmountCryptoPrecision,
                  asset: asset.symbol,
                },
              )}
            </RawText>
          </VStack>
          <Flex direction='column' gap={1} align='center'>
            <Amount.Crypto
              value={collateralAmountCryptoPrecision}
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
          {translate(
            isAddMode
              ? 'chainflipLending.collateral.confirmAdd'
              : 'chainflipLending.collateral.confirmRemove',
          )}
        </Button>
        <Button variant='ghost' size='sm' width='full' onClick={handleBack}>
          {translate('common.back')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
})
