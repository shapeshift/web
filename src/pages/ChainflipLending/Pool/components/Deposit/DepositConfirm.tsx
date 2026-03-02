import { CheckCircleIcon } from '@chakra-ui/icons'
import { Button, CardBody, CardFooter, Flex, VStack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { ethChainId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { BigAmount } from '@shapeshiftoss/utils'
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { DepositMachineCtx } from './DepositMachineContext'
import { DepositStepper } from './DepositStepper'
import { useDepositApproval } from './hooks/useDepositApproval'
import { useDepositChannel } from './hooks/useDepositChannel'
import { useDepositConfirmation } from './hooks/useDepositConfirmation'
import { useDepositFunding } from './hooks/useDepositFunding'
import { useDepositRefundAddress } from './hooks/useDepositRefundAddress'
import { useDepositRegistration } from './hooks/useDepositRegistration'
import { useDepositSend } from './hooks/useDepositSend'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import { useModal } from '@/hooks/useModal/useModal'
import {
  CHAINFLIP_FLIP_TOKEN_ADDRESS,
  CHAINFLIP_GATEWAY_CONTRACT_ADDRESS,
  CHAINFLIP_LENDING_ASSET_BY_ASSET_ID,
  FLIP_FUNDING_AMOUNT_CRYPTO_BASE_UNIT,
} from '@/lib/chainflip/constants'
import { getErc20Allowance } from '@/lib/utils/evm'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { useChainflipAccount } from '@/pages/ChainflipLending/hooks/useChainflipAccount'
import { reactQueries } from '@/react-queries'
import { selectAccountIdsByAccountNumberAndChainId } from '@/state/slices/portfolioSlice/selectors'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type DepositConfirmProps = {
  assetId: AssetId
}

export const DepositConfirm = memo(({ assetId }: DepositConfirmProps) => {
  const translate = useTranslate()
  const queryClient = useQueryClient()
  const { accountNumber, scAccount } = useChainflipLendingAccount()
  const { close: closeModal } = useModal('chainflipLending')
  const { freeBalances } = useChainflipAccount()
  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdsByAccountNumberAndChainId,
  )

  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const actorRef = DepositMachineCtx.useActorRef()
  const isConfirm = DepositMachineCtx.useSelector(s => s.matches('confirm'))
  const isSuccess = DepositMachineCtx.useSelector(s => s.matches('success'))
  const isError = DepositMachineCtx.useSelector(s => s.matches('error'))
  const depositAmountCryptoPrecision = DepositMachineCtx.useSelector(
    s => s.context.depositAmountCryptoPrecision,
  )
  const refundAddress = DepositMachineCtx.useSelector(s => s.context.refundAddress)
  const error = DepositMachineCtx.useSelector(s => s.context.error)
  const isNativeWallet = DepositMachineCtx.useSelector(s => s.context.isNativeWallet)
  const stepConfirmed = DepositMachineCtx.useSelector(s => s.context.stepConfirmed)
  const isConfirming = DepositMachineCtx.useSelector(s => s.matches('confirming'))

  useDepositApproval()
  useDepositFunding()
  useDepositRegistration()
  useDepositRefundAddress()
  useDepositChannel()
  useDepositSend()
  useDepositConfirmation()

  const poolChainId = useMemo(() => fromAssetId(assetId).chainId, [assetId])

  const poolChainAccountId = useMemo(() => {
    const byChainId = accountIdsByAccountNumberAndChainId[accountNumber]
    return byChainId?.[poolChainId]?.[0]
  }, [accountIdsByAccountNumberAndChainId, accountNumber, poolChainId])

  const userAddress = useMemo(
    () => (poolChainAccountId ? fromAccountId(poolChainAccountId).account : undefined),
    [poolChainAccountId],
  )

  const { data: flipAllowanceCryptoBaseUnit, isLoading: isAllowanceLoading } = useQuery({
    queryKey: ['chainflipFlipAllowance', userAddress],
    queryFn: userAddress
      ? () =>
          getErc20Allowance({
            address: CHAINFLIP_FLIP_TOKEN_ADDRESS,
            from: userAddress,
            spender: CHAINFLIP_GATEWAY_CONTRACT_ADDRESS,
            chainId: ethChainId,
          })
      : skipToken,
  })

  const depositAmountCryptoBaseUnit = useMemo(() => {
    if (!asset) return '0'
    return BigAmount.fromPrecision({
      value: depositAmountCryptoPrecision,
      precision: asset.precision,
    }).toBaseUnit()
  }, [depositAmountCryptoPrecision, asset])

  const cfAsset = useMemo(() => CHAINFLIP_LENDING_ASSET_BY_ASSET_ID[assetId], [assetId])

  const initialFreeBalanceCryptoBaseUnit = useMemo(() => {
    if (!freeBalances || !cfAsset) return '0'
    const matching = freeBalances.find(
      b => b.asset.chain === cfAsset.chain && b.asset.asset === cfAsset.asset,
    )
    return matching?.balance ?? '0'
  }, [freeBalances, cfAsset])

  const isLoading = isAllowanceLoading || !asset

  const handleStart = useCallback(() => {
    actorRef.send({
      type: 'START',
      depositAmountCryptoBaseUnit,
      refundAddress: refundAddress || userAddress || '',
      flipAllowanceCryptoBaseUnit: flipAllowanceCryptoBaseUnit ?? '0',
      flipFundingAmountCryptoBaseUnit: FLIP_FUNDING_AMOUNT_CRYPTO_BASE_UNIT,
      initialFreeBalanceCryptoBaseUnit,
    })
  }, [
    actorRef,
    depositAmountCryptoBaseUnit,
    refundAddress,
    userAddress,
    flipAllowanceCryptoBaseUnit,
    initialFreeBalanceCryptoBaseUnit,
  ])

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
                {translate('chainflipLending.deposit.successTitle')}
              </RawText>
              <RawText fontSize='sm' color='text.subtle' textAlign='center'>
                {translate('chainflipLending.deposit.successDescription', {
                  asset: asset.symbol,
                })}
              </RawText>
            </VStack>
            <VStack spacing={1}>
              <RawText fontSize='xs' color='text.subtle'>
                {translate('chainflipLending.deposit.deposited')}
              </RawText>
              <Amount.Crypto
                value={depositAmountCryptoPrecision}
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
                {translate('chainflipLending.deposit.errorTitle')}
              </RawText>
              <RawText fontSize='sm' color='text.subtle' textAlign='center'>
                {error ?? translate('chainflipLending.deposit.errorDescription')}
              </RawText>
            </VStack>
            <DepositStepper assetId={assetId} />
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
                {translate('chainflipLending.deposit.executingTitle')}
              </RawText>
              <RawText fontSize='sm' color='text.subtle' textAlign='center'>
                {translate('chainflipLending.deposit.executingDescription')}
              </RawText>
            </VStack>
            <DepositStepper assetId={assetId} />
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
              {translate('chainflipLending.deposit.confirmTitle')}
            </RawText>
            <RawText fontSize='sm' color='text.subtle' textAlign='center'>
              {translate('chainflipLending.deposit.confirmDescription', {
                amount: depositAmountCryptoPrecision,
                asset: asset.symbol,
              })}
            </RawText>
          </VStack>
          <Flex direction='column' gap={1} align='center'>
            <Amount.Crypto
              value={depositAmountCryptoPrecision}
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
          onClick={handleStart}
          isLoading={isLoading}
          isDisabled={isLoading}
        >
          {translate('chainflipLending.deposit.confirmAndDeposit')}
        </Button>
        <Button variant='ghost' size='sm' width='full' onClick={handleBack}>
          {translate('common.back')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
})
