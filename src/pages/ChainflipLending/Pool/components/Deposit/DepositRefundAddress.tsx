import {
  Button,
  CardBody,
  CardFooter,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Input,
  VStack,
} from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'

import { DepositMachineCtx } from './DepositMachineContext'

import { AccountDropdown } from '@/components/AccountDropdown/AccountDropdown'
import { InlineCopyButton } from '@/components/InlineCopyButton'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'
import { useIsSnapInstalled } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { walletSupportsChain } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import { validateAddress } from '@/lib/address/validation'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import { selectAccountIdsByAccountNumberAndChainId } from '@/state/slices/portfolioSlice/selectors'
import { selectAccountIdsByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const boxProps = { width: 'full', p: 0, m: 0 }
const buttonProps = { width: 'full', variant: 'solid', height: '40px', px: 4 }

type DepositRefundAddressProps = {
  assetId: AssetId
}

type AddressFormValues = {
  manualAddress: string
}

export const DepositRefundAddress = ({ assetId }: DepositRefundAddressProps) => {
  const translate = useTranslate()
  const { wallet } = useWallet().state
  const { isSnapInstalled } = useIsSnapInstalled()
  const { accountNumber } = useChainflipLendingAccount()
  const accountIdsByChainId = useAppSelector(selectAccountIdsByChainId)
  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdsByAccountNumberAndChainId,
  )

  const actorRef = DepositMachineCtx.useActorRef()
  const refundAddress = DepositMachineCtx.useSelector(s => s.context.refundAddress)

  const chainId = useMemo(() => fromAssetId(assetId).chainId, [assetId])

  const poolChainAccountId = useMemo(() => {
    const byChainId = accountIdsByAccountNumberAndChainId[accountNumber]
    return byChainId?.[chainId]?.[0]
  }, [accountIdsByAccountNumberAndChainId, accountNumber, chainId])

  const walletSupportsAssetChain = useMemo(() => {
    const chainAccountIds = accountIdsByChainId[chainId] ?? []
    return walletSupportsChain({
      checkConnectedAccountIds: chainAccountIds,
      chainId,
      wallet,
      isSnapInstalled,
    })
  }, [accountIdsByChainId, chainId, wallet, isSnapInstalled])

  const [defaultAccountId, setDefaultAccountId] = useState<AccountId | undefined>(
    poolChainAccountId,
  )
  const [isCustomAddress, setIsCustomAddress] = useState(false)

  const methods = useForm<AddressFormValues>({
    mode: 'onChange',
    reValidateMode: 'onChange',
  })
  const {
    register,
    formState: { errors },
    setValue,
    trigger,
  } = methods

  useEffect(() => {
    if (!walletSupportsAssetChain) {
      setIsCustomAddress(true)
    }
  }, [walletSupportsAssetChain])

  useEffect(() => {
    if (!isCustomAddress && poolChainAccountId && !refundAddress) {
      const address = fromAccountId(poolChainAccountId).account
      actorRef.send({ type: 'SET_REFUND_ADDRESS', address })
    }
  }, [isCustomAddress, poolChainAccountId, refundAddress, actorRef])

  const handleAccountChange = useCallback(
    (newAccountId: string) => {
      const address = fromAccountId(newAccountId).account
      setDefaultAccountId(newAccountId)
      actorRef.send({ type: 'SET_REFUND_ADDRESS', address })
    },
    [actorRef],
  )

  const handleToggleCustomAddress = useCallback(() => {
    if (!walletSupportsAssetChain) return
    actorRef.send({ type: 'SET_REFUND_ADDRESS', address: '' })
    setIsCustomAddress(prev => !prev)
  }, [walletSupportsAssetChain, actorRef])

  const validateChainAddress = useCallback(
    async (address: string) => {
      if (!address) {
        actorRef.send({ type: 'SET_REFUND_ADDRESS', address: '' })
        return true
      }

      const isValid = await validateAddress({ maybeAddress: address, chainId })

      if (!isValid) {
        actorRef.send({ type: 'SET_REFUND_ADDRESS', address: '' })
        return translate('common.invalidAddress')
      }

      actorRef.send({ type: 'SET_REFUND_ADDRESS', address })
      return true
    },
    [chainId, actorRef, translate],
  )

  const handleManualInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setValue('manualAddress', newValue, { shouldValidate: true })
      await trigger('manualAddress')
    },
    [setValue, trigger],
  )

  const handleContinue = useCallback(() => {
    actorRef.send({ type: 'SUBMIT_REFUND_ADDRESS' })
  }, [actorRef])

  const handleBack = useCallback(() => {
    actorRef.send({ type: 'BACK' })
  }, [actorRef])

  const isDisabled = !refundAddress

  return (
    <SlideTransition>
      <CardBody px={6} py={4}>
        <VStack spacing={6} align='stretch'>
          <VStack spacing={2} align='center'>
            <RawText fontWeight='bold' fontSize='lg' textAlign='center'>
              {translate('chainflipLending.deposit.refundAddress.title')}
            </RawText>
            <RawText fontSize='sm' color='text.subtle' textAlign='center'>
              {translate('chainflipLending.deposit.refundAddress.description')}
            </RawText>
          </VStack>

          <FormControl isInvalid={Boolean(errors.manualAddress)}>
            <HStack justifyContent='space-between' mb={4}>
              <FormLabel fontSize='sm' mb={0}>
                {translate('chainflipLending.deposit.refundAddress.label')}
              </FormLabel>
              {walletSupportsAssetChain && (
                <Button
                  fontSize='sm'
                  variant='link'
                  color='text.link'
                  onClick={handleToggleCustomAddress}
                >
                  {isCustomAddress
                    ? translate('chainflipLending.deposit.refundAddress.useWalletAddress')
                    : translate('chainflipLending.deposit.refundAddress.useCustomAddress')}
                </Button>
              )}
            </HStack>
            {isCustomAddress ? (
              <Input
                {...register('manualAddress', {
                  required: true,
                  validate: { isValidAddress: validateChainAddress },
                })}
                placeholder={translate('common.enterAddress')}
                autoFocus
                defaultValue=''
                autoComplete='off'
                onChange={handleManualInputChange}
              />
            ) : (
              <InlineCopyButton value={refundAddress}>
                <AccountDropdown
                  assetId={assetId}
                  onChange={handleAccountChange}
                  boxProps={boxProps}
                  buttonProps={buttonProps}
                  defaultAccountId={defaultAccountId}
                />
              </InlineCopyButton>
            )}
            {errors.manualAddress ? (
              <FormHelperText color='red.500'>
                {errors.manualAddress.message as string}
              </FormHelperText>
            ) : (
              <FormHelperText>
                {translate('chainflipLending.deposit.refundAddress.helperText')}
              </FormHelperText>
            )}
          </FormControl>
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
          onClick={handleContinue}
          isDisabled={isDisabled}
        >
          {translate('chainflipLending.deposit.refundAddress.continue')}
        </Button>
        <Button variant='ghost' size='sm' width='full' onClick={handleBack}>
          {translate('common.back')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
