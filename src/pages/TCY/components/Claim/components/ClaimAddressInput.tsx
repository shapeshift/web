import { Button, FormControl, FormHelperText, FormLabel, HStack, Input } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, thorchainAssetId, thorchainChainId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm, useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'

import { AccountDropdown } from '@/components/AccountDropdown/AccountDropdown'
import { InlineCopyButton } from '@/components/InlineCopyButton'
import { useIsSnapInstalled } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { walletSupportsChain } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import { validateAddress } from '@/lib/address/validation'
import { selectAccountIdsByAssetId, selectAccountIdsByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const boxProps = {
  width: 'full',
  p: 0,
  m: 0,
}
const buttonProps = {
  width: 'full',
  variant: 'solid',
  height: '40px',
  px: 4,
}

type ClaimAddressInputProps = {
  onActiveAddressChange: (address: string | undefined) => void
  address?: string
  matchingRuneAccountId: string | undefined
}

type AddressFormValues = {
  manualRuneAddress: string
}

export const ClaimAddressInput = ({
  onActiveAddressChange,
  address,
  matchingRuneAccountId,
}: ClaimAddressInputProps) => {
  const translate = useTranslate()
  const { wallet } = useWallet().state
  const { isSnapInstalled } = useIsSnapInstalled()
  const accountIdsByChainId = useAppSelector(selectAccountIdsByChainId)
  const runeAccountIds = useAppSelector(state =>
    selectAccountIdsByAssetId(state, { assetId: thorchainAssetId }),
  )

  const [defaultAccountId, setDefaultAccountId] = useState<AccountId | undefined>(
    matchingRuneAccountId,
  )

  // Local controller in case consumers don't have a form context
  const _methods = useForm<AddressFormValues>({
    mode: 'onChange',
    reValidateMode: 'onChange',
  })
  const methods = useFormContext<AddressFormValues>()

  const register = methods?.register ?? _methods.register
  const formState = methods?.formState ?? _methods.formState
  const trigger = methods?.trigger ?? _methods.trigger
  const setValue = methods?.setValue ?? _methods.setValue
  const { errors } = formState

  const [isCustomAddress, setIsCustomAddress] = useState(false)

  const walletSupportsRune = useMemo(() => {
    const chainId = thorchainChainId
    const chainAccountIds = accountIdsByChainId[chainId] ?? []
    const walletSupport = walletSupportsChain({
      checkConnectedAccountIds: chainAccountIds,
      chainId,
      wallet,
      isSnapInstalled,
    })
    return walletSupport && runeAccountIds.length > 0
  }, [accountIdsByChainId, isSnapInstalled, runeAccountIds.length, wallet])

  // Auto-switch to manual input if no RUNE account is available
  useEffect(() => {
    if (!walletSupportsRune) {
      setIsCustomAddress(true)
    }
  }, [walletSupportsRune])

  const handleRuneAccountIdChange = useCallback(
    (accountId: string) => {
      const address = fromAccountId(accountId).account
      setDefaultAccountId(accountId)
      onActiveAddressChange(address)
    },
    [onActiveAddressChange, setDefaultAccountId],
  )

  const handleToggleCustomAddress = useCallback(() => {
    // Only allow toggling if RUNE is supported
    if (!walletSupportsRune) return

    onActiveAddressChange(undefined)
    setIsCustomAddress(!isCustomAddress)
  }, [isCustomAddress, onActiveAddressChange, walletSupportsRune])

  const validateRuneAddress = useCallback(
    async (address: string) => {
      if (!address) {
        onActiveAddressChange(undefined)
        return true
      }

      const isValid = await validateAddress({
        maybeAddress: address,
        chainId: thorchainChainId,
      })

      if (!isValid) {
        onActiveAddressChange(undefined)
        return translate('common.invalidAddress')
      }

      onActiveAddressChange(address)
      return true
    },
    [onActiveAddressChange, translate],
  )

  const handleCustomAddressInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setValue('manualRuneAddress', newValue, { shouldValidate: true })
      await trigger('manualRuneAddress')
    },
    [setValue, trigger],
  )

  const renderInputSelection = useMemo(() => {
    if (isCustomAddress) {
      return (
        <Input
          {...register('manualRuneAddress', {
            required: true,
            validate: {
              isValidRuneAddress: validateRuneAddress,
            },
          })}
          placeholder={translate('common.enterAddress')}
          autoFocus
          defaultValue=''
          autoComplete='off'
          onChange={handleCustomAddressInputChange}
        />
      )
    }

    return (
      <InlineCopyButton value={address ?? ''}>
        <AccountDropdown
          assetId={thorchainAssetId}
          onChange={handleRuneAccountIdChange}
          boxProps={boxProps}
          buttonProps={buttonProps}
          defaultAccountId={defaultAccountId}
        />
      </InlineCopyButton>
    )
  }, [
    isCustomAddress,
    address,
    handleRuneAccountIdChange,
    register,
    translate,
    validateRuneAddress,
    handleCustomAddressInputChange,
    defaultAccountId,
  ])

  return (
    <FormControl isInvalid={Boolean(errors.manualRuneAddress)}>
      <HStack justifyContent='space-between' mb={4}>
        <FormLabel fontSize='sm' mb={0}>
          {translate('TCY.claimAddressInput.label')}
        </FormLabel>
        {walletSupportsRune && (
          <Button
            fontSize='sm'
            variant='link'
            color='text.link'
            onClick={handleToggleCustomAddress}
          >
            {isCustomAddress
              ? translate('TCY.claimAddressInput.useWalletAddress')
              : translate('TCY.claimAddressInput.useCustomAddress')}
          </Button>
        )}
      </HStack>
      {renderInputSelection}
      {errors.manualRuneAddress ? (
        <FormHelperText color='red.500'>
          {errors.manualRuneAddress.message as string}
        </FormHelperText>
      ) : (
        <FormHelperText>{translate('TCY.claimAddressInput.helperText')}</FormHelperText>
      )}
    </FormControl>
  )
}
