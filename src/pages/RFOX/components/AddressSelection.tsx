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
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

export const AddressSelection = () => {
  const translate = useTranslate()
  const [isManulAddress, setIsManualAddress] = useState(false)

  const handleToggleInputMethod = useCallback(() => {
    setIsManualAddress(!isManulAddress)
  }, [isManulAddress])

  const renderSelection = useMemo(() => {
    if (isManulAddress) {
      return <Input autoFocus />
    }
    return (
      <Select borderRadius='xl' borderColor='border.base'>
        <option value='1234'>1234</option>
        <option value='2365'>2365</option>
      </Select>
    )
  }, [isManulAddress])
  return (
    <FormControl>
      <Stack px={6} py={4}>
        <Flex alignItems='center' justifyContent='space-between' mb={2}>
          <FormLabel fontSize='sm' mb={0}>
            {translate('RFOX.thorchainRewardAddress')}
          </FormLabel>
          <Button variant='link' colorScheme='blue' size='sm' onClick={handleToggleInputMethod}>
            {isManulAddress
              ? translate('RFOX.useWalletAddress')
              : translate('RFOX.useCustomAddress')}
          </Button>
        </Flex>
        {renderSelection}
        <FormHelperText>{translate('RFOX.rewardAddressHelper')}</FormHelperText>
      </Stack>
    </FormControl>
  )
}
