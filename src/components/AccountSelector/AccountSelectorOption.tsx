import { Box, HStack, Radio, Text, VStack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { fromBaseUnit } from '@/lib/math'
import { isUtxoAccountId } from '@/lib/utils/utxo'
import { ProfileAvatar } from '@/pages/Dashboard/components/ProfileAvatar/ProfileAvatar'
import { accountIdToLabel } from '@/state/slices/portfolioSlice/utils'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectPortfolioAccountBalancesBaseUnit,
  selectPortfolioAccountsUserCurrencyBalances,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const radioSx = {
  '&[data-checked]': {
    backgroundColor: 'blue.500',
    borderColor: 'blue.500',
  },
}

type AccountSelectorOptionProps = {
  accountId: AccountId
  isSelected: boolean
  assetId: AssetId
  disabled?: boolean
  onAccountClick: (accountId: AccountId) => void
}

export const AccountSelectorOption = ({
  accountId,
  isSelected,
  disabled,
  assetId,
  onAccountClick,
}: AccountSelectorOptionProps) => {
  const translate = useTranslate()
  const handleClick = useCallback(() => onAccountClick(accountId), [accountId, onAccountClick])
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const accountBalances = useAppSelector(selectPortfolioAccountBalancesBaseUnit)
  const accountUserCurrencyBalances = useAppSelector(selectPortfolioAccountsUserCurrencyBalances)

  const filter = useMemo(() => ({ accountId }), [accountId])
  const accountNumber = useAppSelector(state => selectAccountNumberByAccountId(state, filter))

  const balanceCryptoPrecision = useMemo(
    () => fromBaseUnit(accountBalances?.[accountId]?.[assetId] ?? 0, asset?.precision ?? 0),
    [accountBalances, accountId, assetId, asset?.precision],
  )

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
              {isUtxoAccountId(accountId) ? (
                accountIdToLabel(accountId)
              ) : (
                <MiddleEllipsis value={fromAccountId(accountId).account} />
              )}
            </Text>
          </VStack>
        </HStack>
        <VStack align='end' spacing={1} minW='120px'>
          <Amount.Fiat
            value={accountUserCurrencyBalances?.[accountId]?.[assetId] ?? '0'}
            fontSize='md'
            fontWeight='bold'
            color='text.primary'
          />
          <Amount.Crypto
            value={balanceCryptoPrecision}
            symbol={asset?.symbol ?? ''}
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
}
