import { Avatar, Button, ButtonProps, Flex, ListItem, Stack } from '@chakra-ui/react'
import { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { generatePath } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { RawText } from 'components/Text'
import { accountIdToLabel, isUtxoAccountId } from 'state/slices/portfolioSlice/utils'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectPortfolioCryptoHumanBalanceByFilter,
  selectPortfolioFiatBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AccountEntryProps = {
  accountId: AccountId
  assetId: AssetId
} & ButtonProps

export const AccountEntryRow: React.FC<AccountEntryProps> = ({ accountId, assetId, ...rest }) => {
  const history = useHistory()
  const translate = useTranslate()
  const filter = useMemo(() => ({ assetId, accountId }), [accountId, assetId])
  const accountNumber = useAppSelector(s => selectAccountNumberByAccountId(s, filter))
  const asset = useAppSelector(s => selectAssetById(s, assetId))
  const cryptoBalance = useAppSelector(s => selectPortfolioCryptoHumanBalanceByFilter(s, filter))
  const fiatBalance = useAppSelector(s => selectPortfolioFiatBalanceByFilter(s, filter))
  const { icon, name, symbol } = asset

  const isUtxoAccount = useMemo(() => isUtxoAccountId(accountId), [accountId])

  // for UTXO chains - title is Account #n, account based chains it's the asset name
  const title = useMemo(
    () => (isUtxoAccount ? translate('accounts.accountNumber', { accountNumber }) : name),
    [accountNumber, isUtxoAccount, name, translate],
  )

  const subtitle = useMemo(
    () => (isUtxoAccount ? accountIdToLabel(accountId) : ''),
    [isUtxoAccount, accountId],
  )

  return (
    <ListItem>
      <Button
        variant='ghost'
        py={4}
        width='full'
        height='auto'
        iconSpacing={4}
        leftIcon={<Avatar size='sm' src={icon} />}
        onClick={() => history.push(generatePath('/accounts/:accountId/:assetId', filter))}
        {...rest}
      >
        <Stack alignItems='flex-start' spacing={0} flex={1}>
          <RawText color='var(--chakra-colors-chakra-body-text)'>{title}</RawText>
          <RawText fontSize='sm' color='gray.500'>
            {subtitle}
          </RawText>
        </Stack>
        <Flex flex={1} justifyContent='flex-end' display={{ base: 'none', md: 'flex' }}>
          <Amount.Crypto value={cryptoBalance} symbol={symbol} />
        </Flex>
        <Flex flex={1} justifyContent='flex-end' alignItems='flex-end' direction='column'>
          <Amount.Fiat value={fiatBalance} />
          <Amount.Crypto
            value={cryptoBalance}
            symbol={symbol}
            fontSize='sm'
            display={{ base: 'block', md: 'none' }}
          />
        </Flex>
      </Button>
    </ListItem>
  )
}
