import { ArrowBackIcon } from '@chakra-ui/icons'
import { Box, Button, HStack, IconButton, Radio, RadioGroup, VStack } from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import { RawText } from '@/components/Text'
import { makeBlockiesUrl } from '@/lib/blockies/makeBlockiesUrl'
import { firstFourLastFour } from '@/lib/utils'
import { selectAccountIdsByAccountNumberAndChainId } from '@/state/slices/portfolioSlice/selectors'
import { useAppSelector } from '@/state/store'

// For a given account number, find the first EVM AccountId (they're all the same address) so we can get an address from a given account number
const getEvmAddressForAccountNumber = (
  accountIdsByAccountNumberAndChainId: ReturnType<typeof selectAccountIdsByAccountNumberAndChainId>,
  accountNumber: number,
): string | null => {
  const accountsByChain = accountIdsByAccountNumberAndChainId[accountNumber]
  if (!accountsByChain) return null

  // Find first EVM account ID
  for (const [chainId, accountIds] of Object.entries(accountsByChain)) {
    if (isEvmChainId(chainId) && accountIds?.[0]) {
      return fromAccountId(accountIds[0]).account
    }
  }

  return null
}

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
  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdsByAccountNumberAndChainId,
  )
  const translate = useTranslate()

  const uniqueAccountNumbers = useMemo(() => {
    const accountNumbers = Object.keys(accountIdsByAccountNumberAndChainId)
      .map(Number)
      .filter(accountNumber => {
        const accountsByChain = accountIdsByAccountNumberAndChainId[accountNumber]
        return Object.keys(accountsByChain ?? {}).some(chainId => isEvmChainId(chainId))
      })

    return accountNumbers
  }, [accountIdsByAccountNumberAndChainId])

  // We must pass account number as a string to <RadioGroup /> but we know it's a number, so safe to cast back
  const handleAccountNumberChange = useCallback(
    (accountNumber: string | number) => () => onAccountNumberChange(Number(accountNumber)),
    [onAccountNumberChange],
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
        value={selectedAccountNumber?.toString() || ''}
        onChange={handleAccountNumberChange}
      >
        <VStack spacing={0} align='stretch' px={2} pb={4} flex={1}>
          {uniqueAccountNumbers.map(accountNumber => {
            const address = getEvmAddressForAccountNumber(
              accountIdsByAccountNumberAndChainId,
              accountNumber,
            )
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
                  <LazyLoadAvatar
                    borderRadius='full'
                    boxSize='40px'
                    src={makeBlockiesUrl(address)}
                  />
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
          })}
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
