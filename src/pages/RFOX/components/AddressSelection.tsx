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
import { useCallback, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { AccountDropdown } from 'components/AccountDropdown/AccountDropdown'
import { validateAddress } from 'lib/address/address'

type AddressSelectionProps = {
  onRuneAddressChange: (address: string | undefined) => void
}

const boxProps = {
  width: 'full',
}

export type StakeValues = {
  runeAddress: string | undefined
}

export const AddressSelection = ({ onRuneAddressChange }: AddressSelectionProps) => {
  const translate = useTranslate()

  const {
    register,
    formState: { errors },
  } = useForm<StakeValues>({ mode: 'onChange', shouldUnregister: true })

  const [isManualAddress, setIsManualAddress] = useState(false)

  const handleAccountIdChange = useCallback(
    (accountId: string) => {
      onRuneAddressChange(fromAccountId(accountId).account)
    },
    [onRuneAddressChange],
  )

  const handleToggleInputMethod = useCallback(() => {
    onRuneAddressChange(undefined)
    setIsManualAddress(!isManualAddress)
  }, [isManualAddress, onRuneAddressChange])

  const accountSelection = useMemo(() => {
    if (isManualAddress) {
      return (
        <Input
          {...register('runeAddress', {
            required: translate('A RUNE address is required'),
            minLength: 1,
            validate: async address => {
              const isValid = await validateAddress({
                maybeAddress: address ?? '',
                chainId: thorchainChainId,
              })

              if (!isValid) {
                onRuneAddressChange(undefined)
                return translate('common.invalidAddress')
              }

              onRuneAddressChange(address)
            },
          })}
          placeholder={translate('common.enterAddress')}
          errorBorderColor='red.500'
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
  }, [handleAccountIdChange, isManualAddress, onRuneAddressChange, register, translate])

  return (
    <FormControl isInvalid={Boolean(isManualAddress && errors.runeAddress)}>
      <Stack px={6} py={4}>
        <Flex alignItems='center' justifyContent='space-between' mb={2}>
          <FormLabel fontSize='sm' mb={0}>
            {translate('RFOX.thorchainRewardAddress')}
          </FormLabel>
          <Button variant='link' colorScheme='blue' size='sm' onClick={handleToggleInputMethod}>
            {isManualAddress
              ? translate('RFOX.useWalletAddress')
              : translate('RFOX.useCustomAddress')}
          </Button>
        </Flex>
        <Box width='full'>{accountSelection}</Box>
        <FormHelperText>{translate('RFOX.rewardAddressHelper')}</FormHelperText>
      </Stack>
    </FormControl>
  )
}
