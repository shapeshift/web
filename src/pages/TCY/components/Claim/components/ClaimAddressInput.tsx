import { Button, FormControl, FormHelperText, FormLabel, HStack, Input } from '@chakra-ui/react'
import { thorchainAssetId, thorchainChainId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm, useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'

import { AccountDropdown } from '@/components/AccountDropdown/AccountDropdown'
import { InlineCopyButton } from '@/components/InlineCopyButton'
import { validateAddress } from '@/lib/address/address'

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
  onChange: (address: string | undefined) => void
  value?: string
}

type AddressFormValues = {
  manualRuneAddress: string
}

export const ClaimAddressInput = ({ onChange, value }: ClaimAddressInputProps) => {
  const translate = useTranslate()

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

  const handleRuneAddressChange = useCallback(
    (accountId?: string) => {
      onChange(accountId)
    },
    [onChange],
  )

  const handleToggleCustomAddress = useCallback(() => {
    onChange(undefined)
    setIsCustomAddress(!isCustomAddress)
  }, [isCustomAddress, onChange])

  const validateRuneAddress = useCallback(
    async (address: string) => {
      if (!address) {
        onChange(undefined)
        return true
      }

      const isValid = await validateAddress({
        maybeAddress: address,
        chainId: thorchainChainId,
      })

      if (!isValid) {
        onChange(undefined)
        return translate('common.invalidAddress')
      }

      onChange(address)
      return true
    },
    [onChange, translate],
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
          onChange={async e => {
            const newValue = e.target.value
            setValue('manualRuneAddress', newValue, { shouldValidate: true })
            await trigger('manualRuneAddress')
          }}
        />
      )
    }

    return (
      <InlineCopyButton value={value ?? ''}>
        <AccountDropdown
          assetId={thorchainAssetId}
          onChange={handleRuneAddressChange}
          boxProps={boxProps}
          buttonProps={buttonProps}
          defaultAccountId={value}
        />
      </InlineCopyButton>
    )
  }, [isCustomAddress, value, handleRuneAddressChange, register, translate, setValue, trigger, validateRuneAddress])

  return (
    <FormControl isInvalid={Boolean(errors.manualRuneAddress)}>
      <HStack justifyContent='space-between' mb={4}>
        <FormLabel mb={0}>{translate('TCY.claimAddressInput.label')}</FormLabel>
        <Button variant='link' color='text.link' onClick={handleToggleCustomAddress}>
          {isCustomAddress
            ? translate('TCY.claimAddressInput.useWalletAddress')
            : translate('TCY.claimAddressInput.useCustomAddress')}
        </Button>
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
