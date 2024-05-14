import { WarningIcon } from '@chakra-ui/icons'
import {
  Flex,
  IconButton,
  Popover,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Stack,
} from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { ChainIcon } from 'components/ChainMenu'
import { RawText, Text } from 'components/Text'
import { getAccountTitle } from 'lib/utils/accounts'
import { isUtxoChainId } from 'lib/utils/utxo'
import {
  selectAccountNumberByAccountId,
  selectAssets,
  selectErroredTxHistoryAccounts,
} from 'state/selectors'
import { useAppSelector } from 'state/store'

const warningIcon = <WarningIcon />

const ErroredTxHistoryAccount = ({ accountId }: { accountId: AccountId }) => {
  const translate = useTranslate()
  const assets = useAppSelector(selectAssets)
  const title = getAccountTitle(accountId, assets)
  const { chainId } = fromAccountId(accountId)
  const fontFamily = !isUtxoChainId(chainId) ? 'monospace' : ''
  const accountNumberByAccountIdFilter = useMemo(() => ({ accountId }), [accountId])
  const accountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, accountNumberByAccountIdFilter),
  )

  return (
    <Flex>
      <ChainIcon chainId={chainId} />
      <Stack alignItems='flex-start' spacing={0} ml={2}>
        <RawText color='var(--chakra-colors-chakra-body-text)' fontFamily={fontFamily}>
          {title}
        </RawText>
        <RawText fontSize='sm' color='text.subtle'>
          {translate('accounts.accountNumber', { accountNumber })}
        </RawText>
      </Stack>
    </Flex>
  )
}

export const ErroredTxHistoryAccounts = () => {
  const translate = useTranslate()
  const erroredTxHistoryAccounts = useAppSelector(selectErroredTxHistoryAccounts)

  const accounts = useMemo(() => {
    return erroredTxHistoryAccounts.map(accountId => (
      <ErroredTxHistoryAccount key={accountId} accountId={accountId} />
    ))
  }, [erroredTxHistoryAccounts])

  if (!erroredTxHistoryAccounts.length) return null

  return (
    <Popover>
      <PopoverTrigger>
        <IconButton
          variant='ghost-filled'
          colorScheme='yellow'
          aria-label={translate('common.degradedTransactionHistory')}
          icon={warningIcon}
        />
      </PopoverTrigger>
      <PopoverContent overflow='hidden'>
        <PopoverCloseButton />
        <PopoverHeader fontWeight='bold' borderWidth={0} pt={4} px={4} pb={2}>
          <Text translation='common.degradedTransactionHistory' />
        </PopoverHeader>
        <PopoverBody display='flex' flexDir='column' gap={4} px={4} pb={4} pt={0}>
          <Text color='text.subtle' translation='common.accountTxHistoryError' />
          {accounts}
        </PopoverBody>
      </PopoverContent>
    </Popover>
  )
}
