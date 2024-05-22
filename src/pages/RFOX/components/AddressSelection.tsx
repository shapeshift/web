import {
  Button,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Select,
  Stack,
} from '@chakra-ui/react'
import { type FC, useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

type AddressSelectionProps = {
  isNewAddress?: boolean
}

export const AddressSelection: FC<AddressSelectionProps> = ({ isNewAddress }) => {
  const translate = useTranslate()
  const [isManualAddress, setIsManualAddress] = useState(false)

  const handleToggleInputMethod = useCallback(() => {
    setIsManualAddress(!isManualAddress)
  }, [isManualAddress])

  const renderSelection = useMemo(() => {
    if (isManualAddress) {
      return <Input autoFocus />
    }
    return (
      <Select borderRadius='xl' borderColor='border.base'>
        <option value='1234'>1234</option>
        <option value='2365'>2365</option>
      </Select>
    )
  }, [isManualAddress])

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
    <FormControl>
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
        {renderSelection}
        <FormHelperText>{addressSelectionDescription}</FormHelperText>
      </Stack>
    </FormControl>
  )
}
