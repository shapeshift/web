import { ArrowBackIcon } from '@chakra-ui/icons'
import { Box, Button, HStack, IconButton, Radio, RadioGroup, VStack } from '@chakra-ui/react'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import { RawText } from '@/components/Text'
import { makeBlockiesUrl } from '@/lib/blockies/makeBlockiesUrl'
import { firstFourLastFour } from '@/lib/utils'
import {
  selectEvmAddressByAccountNumber,
  selectUniqueEvmAccountNumbers,
} from '@/state/slices/portfolioSlice/selectors'
import { store, useAppSelector } from '@/state/store'

const spacerBox = <Box w={8} />
const backIcon = <ArrowBackIcon />

type AccountSelectionProps = {
  selectedAccountNumber: number | null
  onAccountNumberChange: (accountNumber: number) => void
  onBack: () => void
  onDone: () => void
}

export const AccountSelection: FC<AccountSelectionProps> = ({
  selectedAccountNumber,
  onAccountNumberChange,
  onBack,
  onDone,
}) => {
  const translate = useTranslate()

  const uniqueAccountNumbers = useAppSelector(selectUniqueEvmAccountNumbers)

  // We must pass account number as a string to <RadioGroup /> but we know it's a number, so safe to cast back
  const handleAccountNumberChange = useCallback(
    (accountNumber: string | number) => () => onAccountNumberChange(Number(accountNumber)),
    [onAccountNumberChange],
  )

  const accountRows = useMemo(
    () =>
      uniqueAccountNumbers.map(accountNumber => {
        const address = selectEvmAddressByAccountNumber(store.getState(), { accountNumber })
        if (!address) return null

        return (
          <Box key={accountNumber} py={3}>
            <HStack
              spacing={3}
              width='full'
              align='center'
              cursor='pointer'
              onClick={handleAccountNumberChange(accountNumber)}
            >
              <LazyLoadAvatar borderRadius='full' boxSize='40px' src={makeBlockiesUrl(address)} />
              <VStack spacing={0} align='start' flex={1}>
                <RawText fontSize='md' fontWeight='medium'>
                  {translate('accounts.accountNumber', { accountNumber })}
                </RawText>
                <RawText fontSize='sm' color='gray.500'>
                  {firstFourLastFour(address)}
                </RawText>
              </VStack>
              <Radio value={accountNumber.toString()} />
            </HStack>
          </Box>
        )
      }),
    [uniqueAccountNumbers, translate, handleAccountNumberChange],
  )

  return (
    <VStack spacing={0} align='stretch' h='full'>
      <HStack spacing={3} p={4} align='center'>
        <IconButton aria-label='Back' icon={backIcon} size='sm' variant='ghost' onClick={onBack} />
        <RawText fontWeight='semibold' fontSize='xl' flex={1} textAlign='center'>
          {translate('plugins.walletConnectToDapps.modal.chooseAccount')}
        </RawText>
        {spacerBox}
      </HStack>
      <RadioGroup
        value={selectedAccountNumber?.toString() ?? ''}
        onChange={handleAccountNumberChange}
      >
        <VStack spacing={0} align='stretch' px={2} pb={4} flex={1}>
          {accountRows}
        </VStack>
      </RadioGroup>
      <Box p={4}>
        <Button
          size='lg'
          colorScheme='blue'
          w='full'
          onClick={onDone}
          isDisabled={selectedAccountNumber === null}
        >
          {translate('common.done')}
        </Button>
      </Box>
    </VStack>
  )
}
