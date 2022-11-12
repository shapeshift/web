import { ChevronRightIcon } from '@chakra-ui/icons'
import { type ButtonProps, Avatar, Button, Stack, useColorModeValue } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { ethAssetId, ethChainId, fromAccountId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { RawText } from 'components/Text/Text'
import { firstFourLastFour } from 'state/slices/portfolioSlice/utils'
import {
  selectAssetById,
  selectPortfolioAccountBalanceByAccountNumberAndChainId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const AccountButton = ({
  accountIds,
  accountNumber,
  onClick,
  buttonProps,
}: {
  accountIds: AccountId[]
  accountNumber: number
  onClick: (account: AccountId) => void
  buttonProps?: ButtonProps
}) => {
  const bg = useColorModeValue('gray.100', 'gray.900')
  const translate = useTranslate()
  const accountId = useMemo(() => accountIds[0], [accountIds])
  const title = useMemo(() => firstFourLastFour(fromAccountId(accountId).account), [accountId])
  const filter = useMemo(() => ({ accountNumber, chainId: ethChainId }), [accountNumber])
  const fiatBalance = useAppSelector(s =>
    selectPortfolioAccountBalanceByAccountNumberAndChainId(s, filter),
  )
  const feeAsset = useAppSelector(s => selectAssetById(s, ethAssetId))
  const color = feeAsset?.color ?? ''
  return (
    <Button
      variant='ghost'
      py={4}
      flex={1}
      height='auto'
      width='full'
      bg={bg}
      iconSpacing={4}
      fontSize={{ base: 'sm', md: 'md' }}
      leftIcon={
        // space in string interpolation is not a bug - see Chakra UI Avatar docs
        <Avatar bg={`${color}20`} color={color} size='sm' name={`# ${accountNumber}`} />
      }
      rightIcon={<ChevronRightIcon />}
      onClick={() => onClick(accountId)}
      {...buttonProps}
    >
      <Stack alignItems='flex-start' spacing={0}>
        <RawText color='var(--chakra-colors-chakra-body-text)' fontFamily='monospace'>
          {title}
        </RawText>
        <RawText fontSize='sm' color='gray.500'>
          {translate('accounts.accountNumber', { accountNumber })}
        </RawText>
      </Stack>
      <Stack direction='row' alignItems='center' spacing={6} ml='auto'>
        <Amount.Fiat value={fiatBalance} color='var(--chakra-colors-chakra-body-text)' />
      </Stack>
    </Button>
  )
}
