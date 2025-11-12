import { Box, Button, HStack, Radio, RadioGroup, VStack } from '@chakra-ui/react'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import { DialogBackButton } from '@/components/Modal/components/DialogBackButton'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import {
  DialogHeader,
  DialogHeaderLeft,
  DialogHeaderMiddle,
} from '@/components/Modal/components/DialogHeader'
import { DialogTitle } from '@/components/Modal/components/DialogTitle'
import { RawText } from '@/components/Text'
import { makeBlockiesUrl } from '@/lib/blockies/makeBlockiesUrl'
import { middleEllipsis } from '@/lib/utils'
import {
  selectEvmAddressByAccountNumber,
  selectUniqueEvmAccountNumbers,
} from '@/state/slices/portfolioSlice/selectors'
import { store, useAppSelector } from '@/state/store'

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
                  {middleEllipsis(address)}
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
      <DialogHeader>
        <DialogHeaderLeft>
          <DialogBackButton onClick={onBack} />
        </DialogHeaderLeft>
        <DialogHeaderMiddle>
          <DialogTitle>{translate('plugins.walletConnectToDapps.modal.chooseAccount')}</DialogTitle>
        </DialogHeaderMiddle>
      </DialogHeader>
      <DialogBody>
        <RadioGroup
          value={selectedAccountNumber?.toString() ?? ''}
          onChange={handleAccountNumberChange}
        >
          <VStack spacing={0} align='stretch' pb={4} flex={1}>
            {accountRows}
          </VStack>
        </RadioGroup>
      </DialogBody>
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
