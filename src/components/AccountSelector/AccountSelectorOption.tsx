import { Box, HStack, Radio, Text, VStack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { memo, useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { fromBaseUnit } from '@/lib/math'
import { isUtxoAccountId } from '@/lib/utils/utxo'
import { ProfileAvatar } from '@/pages/Dashboard/components/ProfileAvatar/ProfileAvatar'
import { accountIdToLabel } from '@/state/slices/portfolioSlice/utils'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const radioSx = {
  '&[data-checked]': {
    backgroundColor: 'blue.500',
    borderColor: 'blue.500',
  },
}

type AccountSelectorOptionProps = {
  accountId: AccountId
  assetId: AssetId
  cryptoBalance: string
  fiatBalance: string
  symbol: string
  isSelected: boolean
  disabled?: boolean
  accountNumber: number
  onOptionClick: (accountId: AccountId) => void
}

export const AccountSelectorOption = memo(
  ({
    accountId,
    assetId,
    cryptoBalance,
    fiatBalance,
    symbol,
    isSelected,
    disabled,
    accountNumber,
    onOptionClick,
  }: AccountSelectorOptionProps) => {
    const translate = useTranslate()
    const handleClick = useCallback(
      () => !disabled && onOptionClick(accountId),
      [accountId, disabled, onOptionClick],
    )

    const asset = useAppSelector(state => selectAssetById(state, assetId))

    const cryptoBalancePrecision = fromBaseUnit(cryptoBalance, asset?.precision ?? 0)

    return (
      <Box
        py={2}
        px={1}
        borderRadius='xl'
        cursor={disabled ? 'not-allowed' : 'pointer'}
        onClick={handleClick}
        transition='all 0.2s'
        opacity={disabled ? 0.5 : 1}
      >
        <HStack justify='space-between' align='center' spacing={4}>
          <HStack spacing={3} flex={1}>
            <ProfileAvatar size='sm' borderRadius='full' />
            <VStack align='start' spacing={0} flex={1}>
              {!isUtxoAccountId(accountId) && (
                <Text fontSize='sm' color='text.subtle'>
                  {translate('accounts.accountNumber', { accountNumber })}
                </Text>
              )}
              <Text fontSize='sm' fontWeight='bold' color='text.primary'>
                {isUtxoAccountId(accountId) ? (
                  accountIdToLabel(accountId)
                ) : (
                  <MiddleEllipsis value={fromAccountId(accountId).account} />
                )}
              </Text>
            </VStack>
          </HStack>
          <VStack align='end' spacing={0} minW='120px'>
            <Amount.Fiat value={fiatBalance} fontSize='md' fontWeight='bold' color='text.primary' />
            <Amount.Crypto
              value={cryptoBalancePrecision}
              symbol={symbol}
              fontSize='sm'
              color='text.subtle'
            />
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
  },
)
