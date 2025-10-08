import { Box, HStack, Radio, Text, VStack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { ProfileAvatar } from '@/pages/Dashboard/components/ProfileAvatar/ProfileAvatar'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type AccountSelectorOptionProps = {
  accountId: AccountId
  accountNumber: number
  cryptoBalance: string
  symbol: string
  isSelected: boolean
  assetId: AssetId
  disabled?: boolean
  onOptionClick: (accountId: AccountId) => void
}

const radioSx = {
  '&[data-checked]': {
    backgroundColor: 'blue.500',
    borderColor: 'blue.500',
  },
}

export const AccountSelectorOption = ({
  accountId,
  accountNumber,
  cryptoBalance,
  symbol,
  isSelected,
  disabled,
  assetId,
  onOptionClick,
}: AccountSelectorOptionProps) => {
  const translate = useTranslate()
  const handleClick = useCallback(() => onOptionClick(accountId), [accountId, onOptionClick])
  const assetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetId),
  )

  const balanceUserCurrency = useMemo(() => {
    return bnOrZero(cryptoBalance)
      .times(assetMarketData?.price ?? 0)
      .toFixed(2)
  }, [cryptoBalance, assetMarketData?.price])

  return (
    <Box
      py={2}
      px={1}
      borderRadius='xl'
      cursor={disabled ? 'not-allowed' : 'pointer'}
      onClick={!disabled ? handleClick : undefined}
      opacity={disabled ? 0.5 : 1}
      transition='all 0.2s'
    >
      <HStack justify='space-between' align='center' spacing={4}>
        <HStack spacing={3} flex={1}>
          <ProfileAvatar size='sm' borderRadius='full' />
          <VStack align='start' spacing={1} flex={1}>
            <Text fontSize='sm' color='text.subtle'>
              {translate('accounts.accountNumber', { accountNumber })}
            </Text>
            <Text fontSize='sm' fontWeight='bold' color='text.primary'>
              <MiddleEllipsis value={fromAccountId(accountId).account} />
            </Text>
          </VStack>
        </HStack>
        <VStack align='end' spacing={1} minW='120px'>
          <Amount.Fiat
            value={balanceUserCurrency}
            fontSize='md'
            fontWeight='bold'
            color='text.primary'
          />
          <Amount.Crypto value={cryptoBalance} symbol={symbol} fontSize='sm' color='text.subtle' />
        </VStack>
        <Radio
          value={accountId}
          isChecked={isSelected}
          isDisabled={disabled}
          colorScheme='blue'
          size='md'
          sx={radioSx}
        />
      </HStack>
    </Box>
  )
}
