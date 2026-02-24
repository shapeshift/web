import { CheckCircleIcon } from '@chakra-ui/icons'
import { Button, CardBody, CardFooter, Flex, VStack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { ethChainId, fromAccountId } from '@shapeshiftoss/caip'
import { BigAmount } from '@shapeshiftoss/utils'
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import type { DepositMachineInput } from './depositMachine'
import { DepositMachineCtx } from './DepositMachineContext'
import { DepositStepper } from './DepositStepper'
import { useDepositApproval } from './hooks/useDepositApproval'
import { useDepositChannel } from './hooks/useDepositChannel'
import { useDepositConfirmation } from './hooks/useDepositConfirmation'
import { useDepositFunding } from './hooks/useDepositFunding'
import { useDepositRefundAddress } from './hooks/useDepositRefundAddress'
import { useDepositRegistration } from './hooks/useDepositRegistration'
import { useDepositSend } from './hooks/useDepositSend'
import { DepositRoutePaths } from './types'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
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
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type DepositConfirmProps = {
  assetId: AssetId
  depositAmountCryptoPrecision: string
  refundAddress?: string
  onReset: () => void
}

const DepositConfirmContent = memo(
  ({ assetId, depositAmountCryptoPrecision, onReset }: DepositConfirmProps) => {
    const translate = useTranslate()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { scAccount } = useChainflipLendingAccount()

    const asset = useAppSelector(state => selectAssetById(state, assetId))

    const stateValue = DepositMachineCtx.useSelector(s => s.value) as string
    const error = DepositMachineCtx.useSelector(s => s.context.error)
    const actorRef = DepositMachineCtx.useActorRef()

    useDepositApproval()
    useDepositFunding()
    useDepositRegistration()
    useDepositRefundAddress()
    useDepositChannel()
    useDepositSend()
    useDepositConfirmation()

    const isIdle = stateValue === 'idle'
    const isSuccess = stateValue === 'success'
    const isError = stateValue === 'error'
    const isExecuting = !isIdle && !isSuccess && !isError

    const handleStart = useCallback(() => {
      actorRef.send({ type: 'START' })
    }, [actorRef])

    const handleRetry = useCallback(() => {
      actorRef.send({ type: 'RETRY' })
    }, [actorRef])

    const handleDone = useCallback(async () => {
      if (scAccount) {
        await queryClient.invalidateQueries(reactQueries.chainflipLending.freeBalances(scAccount))
        await queryClient.invalidateQueries(reactQueries.chainflipLending.accountInfo(scAccount))
      }
      onReset()
      navigate(DepositRoutePaths.Input)
    }, [scAccount, queryClient, onReset, navigate])

    const handleBack = useCallback(() => {
      navigate(DepositRoutePaths.Input)
    }, [navigate])

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
              <DepositStepper />
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

    if (isExecuting) {
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
              <DepositStepper />
            </VStack>
          </CardBody>
          <CardFooter
            borderTopWidth={1}
            borderColor='border.subtle'
            flexDir='column'
            gap={2}
            px={6}
            py={4}
          />
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
          >
            {translate('chainflipLending.deposit.confirmAndDeposit')}
          </Button>
          <Button variant='ghost' size='sm' width='full' onClick={handleBack}>
            {translate('common.back')}
          </Button>
        </CardFooter>
      </SlideTransition>
    )
  },
)

export const DepositConfirm = ({
  assetId,
  depositAmountCryptoPrecision,
  refundAddress: refundAddressProp,
  onReset,
}: DepositConfirmProps) => {
  const { accountId } = useChainflipLendingAccount()
  const {
    isFunded,
    isLpRegistered,
    hasRefundAddress,
    freeBalances,
    isLoading: isAccountLoading,
  } = useChainflipAccount()

  const userAddress = useMemo(
    () => (accountId ? fromAccountId(accountId).account : undefined),
    [accountId],
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

  const asset = useAppSelector(state => selectAssetById(state, assetId))

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

  const machineInput: DepositMachineInput | undefined = useMemo(() => {
    if (isAccountLoading || isAllowanceLoading || !asset) return undefined

    return {
      assetId,
      depositAmountCryptoPrecision,
      depositAmountCryptoBaseUnit,
      refundAddress: refundAddressProp || userAddress || '',
      flipAllowanceCryptoBaseUnit: flipAllowanceCryptoBaseUnit ?? '0',
      flipFundingAmountCryptoBaseUnit: FLIP_FUNDING_AMOUNT_CRYPTO_BASE_UNIT,
      isFunded,
      isLpRegistered,
      hasRefundAddress,
      initialFreeBalanceCryptoBaseUnit,
    }
  }, [
    isAccountLoading,
    isAllowanceLoading,
    asset,
    assetId,
    depositAmountCryptoPrecision,
    depositAmountCryptoBaseUnit,
    refundAddressProp,
    userAddress,
    flipAllowanceCryptoBaseUnit,
    isFunded,
    isLpRegistered,
    hasRefundAddress,
    initialFreeBalanceCryptoBaseUnit,
  ])

  if (!machineInput) {
    return (
      <SlideTransition>
        <CardBody px={6} py={4}>
          <VStack spacing={6} align='center' py={6}>
            <CircularProgress isIndeterminate />
          </VStack>
        </CardBody>
      </SlideTransition>
    )
  }

  return (
    <DepositMachineCtx.Provider options={{ input: machineInput }}>
      <DepositConfirmContent
        assetId={assetId}
        depositAmountCryptoPrecision={depositAmountCryptoPrecision}
        onReset={onReset}
      />
    </DepositMachineCtx.Provider>
  )
}
