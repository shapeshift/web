import {
  Box,
  Button,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Stack,
} from '@chakra-ui/react'
import { fromAccountId, thorchainAssetId, thorchainChainId } from '@shapeshiftoss/caip'
import type { FC } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useForm, useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { AccountDropdown } from 'components/AccountDropdown/AccountDropdown'
import type { TradeAmountInputFormValues } from 'components/MultiHopTrade/components/TradeAmountInput'
import { validateAddress } from 'lib/address/address'

type AddressSelectionProps = {
  onRuneAddressChange: (address: string | undefined) => void
  isNewAddress?: boolean
}

const boxProps = {
  width: 'full',
}

export type StakeValues = {
  manualRuneAddress: string | undefined
} & TradeAmountInputFormValues

export const AddressSelection: FC<AddressSelectionProps> = ({
  onRuneAddressChange: handleRuneAddressChange,
  isNewAddress,
}) => {
  const translate = useTranslate()

  // Local controller in case consumers don't have a form context
  const _methods = useForm<StakeValues>()
  const methods = useFormContext<StakeValues>()

  const register = methods?.register ?? _methods.register
  const formState = methods?.formState ?? _methods.formState
  const { errors } = formState

  const [isManualAddress, setIsManualAddress] = useState(false)

  const handleAccountIdChange = useCallback(
    (accountId: string) => {
      handleRuneAddressChange(fromAccountId(accountId).account)
    },
    [handleRuneAddressChange],
  )

  const handleToggleInputMethod = useCallback(() => {
    handleRuneAddressChange(undefined)
    setIsManualAddress(!isManualAddress)
  }, [isManualAddress, handleRuneAddressChange])

  const accountSelection = useMemo(() => {
    if (isManualAddress) {
      return (
        <Input
          {...register('manualRuneAddress', {
            required: translate('A RUNE address is required'),
            minLength: 1,
            validate: async address => {
              const isValid = await validateAddress({
                maybeAddress: address ?? '',
                chainId: thorchainChainId,
              })

              if (!isValid) {
                handleRuneAddressChange(undefined)
                return translate('common.invalidAddress')
              }

              handleRuneAddressChange(address)
            },
          })}
          placeholder={translate('common.enterAddress')}
          autoFocus
          defaultValue=''
        />
      )
    }

    return (
      <AccountDropdown
        assetId={thorchainAssetId}
        onChange={handleAccountIdChange}
        boxProps={boxProps}
      />
    )
  }, [handleAccountIdChange, isManualAddress, handleRuneAddressChange, register, translate])

  const addressSelectionLabel = useMemo(
    () =>
      isNewAddress ? translate('RFOX.newRewardAddress') : translate('RFOX.thorchainRewardAddress'),
    [isNewAddress, translate],
  )

  const addressSelectionDescription = useMemo(
    () =>
      isNewAddress ? translate('RFOX.rewardCycleExplainer') : translate('RFOX.rewardAddressHelper'),
    [isNewAddress, translate],
  )

  return (
    <FormControl isInvalid={Boolean(isManualAddress && errors.manualRuneAddress)}>
      <Stack px={6} py={4}>
        <Flex alignItems='center' justifyContent='space-between' mb={2}>
          <FormLabel fontSize='sm' mb={0}>
            {addressSelectionLabel}
          </FormLabel>
          <Button variant='link' colorScheme='blue' size='sm' onClick={handleToggleInputMethod}>
            {isManualAddress
              ? translate('RFOX.useWalletAddress')
              : translate('RFOX.useCustomAddress')}
          </Button>
        </Flex>
        <Box width='full'>{accountSelection}</Box>
        <FormHelperText>{addressSelectionDescription}</FormHelperText>
      </Stack>
    </FormControl>
  )
}
