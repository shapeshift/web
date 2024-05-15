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
import { fromAccountId, thorchainAssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { AccountDropdown } from 'components/AccountDropdown/AccountDropdown'

type AddressSelectionProps = {
  onRuneAddressChange: (address: string) => void
}

const boxProps = {
  width: 'full',
}

export const AddressSelection = ({ onRuneAddressChange }: AddressSelectionProps) => {
  const translate = useTranslate()
  const [isManualAddress, setIsManualAddress] = useState(false)

  const handleAccountIdChange = useCallback(
    (accountId: string) => {
      onRuneAddressChange(fromAccountId(accountId).account)
    },
    [onRuneAddressChange],
  )

  const handleToggleInputMethod = useCallback(() => {
    setIsManualAddress(!isManualAddress)
  }, [isManualAddress])

  const accountSelection = useMemo(() => {
    if (isManualAddress) {
      return <Input autoFocus />
    }

    return (
      <AccountDropdown
        assetId={thorchainAssetId}
        onChange={handleAccountIdChange}
        boxProps={boxProps}
      />
    )
  }, [handleAccountIdChange, isManualAddress])

  return (
    <FormControl>
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
