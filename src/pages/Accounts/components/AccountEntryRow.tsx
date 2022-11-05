import type { ButtonProps } from '@chakra-ui/react'
import { Avatar, Button, Flex, ListItem, Stack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@keepkey/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { useHistory } from 'react-router'
import { generatePath } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { RawText } from 'components/Text'
import {
  selectPortfolioAccountsCryptoHumanBalancesIncludingStaking,
  selectPortfolioAccountsFiatBalancesIncludingStaking,
} from 'state/slices/portfolioSlice/selectors'
import { accountIdToLabel, isUtxoAccountId } from 'state/slices/portfolioSlice/utils'
import { selectAccountNumberByAccountId, selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AccountEntryRowProps = {
  accountId: AccountId
  assetId: AssetId
} & ButtonProps

export const AccountEntryRow: React.FC<AccountEntryRowProps> = ({
  accountId,
  assetId,
  ...buttonProps
}) => {
  const history = useHistory()
  const translate = useTranslate()
  const filter = useMemo(() => ({ assetId, accountId }), [accountId, assetId])
  const accountNumber = useAppSelector(s => selectAccountNumberByAccountId(s, filter))
  const asset = useAppSelector(s => selectAssetById(s, assetId))
  const cryptoBalances = useSelector(selectPortfolioAccountsCryptoHumanBalancesIncludingStaking)
  const fiatBalances = useSelector(selectPortfolioAccountsFiatBalancesIncludingStaking)
  const cryptoBalance = cryptoBalances?.[accountId]?.[assetId]
  const fiatBalance = fiatBalances?.[accountId]?.[assetId]
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
        data-test='account-asset-row-button'
        fontSize={{ base: 'sm', md: 'md' }}
        leftIcon={<Avatar size='sm' src={icon} />}
        onClick={() => history.push(generatePath('/accounts/:accountId/:assetId', filter))}
        {...buttonProps}
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
