import {
  Box,
  Button,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Stack,
  Tag,
} from '@chakra-ui/react'
import { fromAccountId, thorchainAssetId, thorchainChainId, toAccountId } from '@shapeshiftoss/caip'
import type { FC } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useForm, useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { AccountDropdown } from 'components/AccountDropdown/AccountDropdown'
import { InlineCopyButton } from 'components/InlineCopyButton'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { validateAddress } from 'lib/address/address'
import {
  selectAccountIdByAccountNumberAndChainId,
  selectAccountNumberByAccountId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { selectRuneAddress } from '../helpers'
import { useRFOXContext } from '../hooks/useRfoxContext'
import { useStakingInfoQuery } from '../hooks/useStakingInfoQuery'
import type { AddressSelectionValues } from '../types'

type AddressSelectionProps = {
  onRuneAddressChange: (address: string | undefined) => void
  selectedAddress: string | undefined
} & (
  | {
      isNewAddress: boolean
      validateIsNewAddress: (address: string) => boolean
    }
  | {
      isNewAddress?: never
      validateIsNewAddress?: never
    }
)

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

export const AddressSelection: FC<AddressSelectionProps> = ({
  onRuneAddressChange: handleRuneAddressChange,
  isNewAddress,
  selectedAddress,
  validateIsNewAddress,
}) => {
  const translate = useTranslate()

  // Local controller in case consumers don't have a form context
  const _methods = useForm<AddressSelectionValues>()
  const methods = useFormContext<AddressSelectionValues>()

  const register = methods?.register ?? _methods.register
  const formState = methods?.formState ?? _methods.formState
  const { errors } = formState

  const { stakingAssetId, stakingAssetAccountId } = useRFOXContext()
  const { data: currentRuneAddress } = useStakingInfoQuery({
    stakingAssetAccountAddress: stakingAssetAccountId
      ? fromAccountId(stakingAssetAccountId).account
      : undefined,
    select: selectRuneAddress,
  })

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

  const manualAddressSelection = useMemo(() => {
    if (!isManualAddress) return null
    return (
      <Input
        {...register('manualRuneAddress', {
          minLength: 1,
          validate: {
            ...(validateIsNewAddress
              ? {
                  validateIsNewAddress: address => {
                    // User inputed something and then deleted it - don't trigger an invalid error, we're simply not ready, again.
                    if (!address) {
                      handleRuneAddressChange(undefined)
                      return true
                    }

                    const isNewAddress = validateIsNewAddress(address)

                    // Not a new address - we should obviously trigger an error
                    if (!isNewAddress) {
                      handleRuneAddressChange(undefined)
                      return translate('RFOX.sameAddressNotAllowed')
                    }

                    // Tada, we know this is not the same as the previous rewards address - fire the onRuneAddressChange callback to notify the consumer we're g2g
                    handleRuneAddressChange(address)
                  },
                }
              : {}),
            isValidRuneAddress: async address => {
              // User inputed something and then deleted it - don't trigger an invalid error, we're simply not ready, again.
              if (!address) {
                handleRuneAddressChange(undefined)
                return true
              }

              const isValid = await validateAddress({
                maybeAddress: address ?? '',
                chainId: thorchainChainId,
              })

              // Inputs failing bech32 THOR address validation should obviously trigger an error
              if (!isValid) {
                handleRuneAddressChange(undefined)
                return translate('common.invalidAddress')
              }

              handleRuneAddressChange(address)
              // Tada, we've passed bech32 validation - fire the onRuneAddressChange callback to notify the consumer we're g2g
              handleRuneAddressChange(address)
            },
          },
        })}
        placeholder={translate('common.enterAddress')}
        autoFocus
        defaultValue=''
        autoComplete='off'
      />
    )
  }, [handleRuneAddressChange, isManualAddress, register, translate, validateIsNewAddress])

  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdByAccountNumberAndChainId,
  )

  const stakingAssetAccountNumberFilter = useMemo(
    () =>
      stakingAssetAccountId && stakingAssetId
        ? { assetId: stakingAssetId, accountId: stakingAssetAccountId }
        : undefined,
    [stakingAssetAccountId, stakingAssetId],
  )
  const stakingAssetAccountNumber = useAppSelector(state =>
    stakingAssetAccountNumberFilter
      ? selectAccountNumberByAccountId(state, stakingAssetAccountNumberFilter)
      : undefined,
  )

  const maybeMatchingRuneAccountId = useMemo(() => {
    if (stakingAssetAccountNumber === undefined) return
    const accountNumberAccountIds = accountIdsByAccountNumberAndChainId[stakingAssetAccountNumber]
    const runeAccountId = accountNumberAccountIds?.[thorchainChainId]
    return runeAccountId
  }, [accountIdsByAccountNumberAndChainId, stakingAssetAccountNumber])

  const maybeRuneAccountId = useMemo(() => {
    if (selectedAddress) return toAccountId({ account: selectedAddress, chainId: thorchainChainId })
    if (currentRuneAddress)
      return toAccountId({ account: currentRuneAddress, chainId: thorchainChainId })
    if (maybeMatchingRuneAccountId) return maybeMatchingRuneAccountId
    return undefined
  }, [currentRuneAddress, maybeMatchingRuneAccountId, selectedAddress])

  const maybeSelectedRuneAddress = useMemo(() => {
    if (!maybeRuneAccountId) return
    return fromAccountId(maybeRuneAccountId).account
  }, [maybeRuneAccountId])

  const filter = useMemo(() => ({ accountId: maybeRuneAccountId }), [maybeRuneAccountId])
  const accountNumber = useAppSelector(state => selectAccountNumberByAccountId(state, filter))
  console.log({ accountNumber, maybeRuneAccountId })

  const accountSelection = useMemo(() => {
    if (isManualAddress) return null

    return (
      <InlineCopyButton
        isDisabled={!maybeSelectedRuneAddress}
        value={maybeSelectedRuneAddress ?? ''}
      >
        {accountNumber !== undefined ? (
          <AccountDropdown
            defaultAccountId={maybeRuneAccountId}
            assetId={thorchainAssetId}
            onChange={handleAccountIdChange}
            boxProps={boxProps}
            buttonProps={buttonProps}
          />
        ) : (
          <Tag colorScheme='gray'>
            <MiddleEllipsis value={maybeSelectedRuneAddress ?? ''} />
          </Tag>
        )}
      </InlineCopyButton>
    )
  }, [
    handleAccountIdChange,
    isManualAddress,
    maybeRuneAccountId,
    maybeSelectedRuneAddress,
    accountNumber,
  ])

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
          <Button
            variant='link'
            colorScheme='blue'
            size='sm-multiline'
            onClick={handleToggleInputMethod}
          >
            {isManualAddress
              ? translate('RFOX.useWalletAddress')
              : translate('RFOX.useCustomAddress')}
          </Button>
        </Flex>
        <Box width='full'>{accountSelection || manualAddressSelection}</Box>
        <FormHelperText>{addressSelectionDescription}</FormHelperText>
      </Stack>
    </FormControl>
  )
}
