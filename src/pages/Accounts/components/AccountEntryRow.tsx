import type { ButtonProps } from '@chakra-ui/react'
import { Button, Flex, ListItem, Stack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { useHistory } from 'react-router'
import { generatePath } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { RawText } from 'components/Text'
import { middleEllipsis } from 'lib/utils'
import { isUtxoAccountId } from 'lib/utils/utxo'
import {
  selectPortfolioAccountsCryptoHumanBalancesIncludingStaking,
  selectPortfolioAccountsUserCurrencyBalancesIncludingStaking,
} from 'state/slices/portfolioSlice/selectors'
import { accountIdToLabel } from 'state/slices/portfolioSlice/utils'
import { selectAccountNumberByAccountId, selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AccountEntryRowProps = {
  accountId: AccountId
  assetId: AssetId
} & ButtonProps

const fontSizeProps = { base: 'sm', md: 'md' }
const flexDisplayProps = { base: 'none', md: 'flex' }
const cryptoDisplayProps = { base: 'block', md: 'none' }

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
  const fiatBalances = useSelector(selectPortfolioAccountsUserCurrencyBalancesIncludingStaking)
  const cryptoBalance = cryptoBalances?.[accountId]?.[assetId] ?? '0'
  const fiatBalance = fiatBalances?.[accountId]?.[assetId] ?? '0'
  const { icon, name, symbol } = asset ?? {}

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

  const assetIdOrIconSrcProps = useMemo(
    () =>
      asset?.icons
        ? { assetId, name: title, bg: asset.color }
        : { src: icon, name: title, bg: asset?.color },
    [asset?.icons, assetId, icon, title, asset?.color],
  )

  const AccountEntryRowLeftIcon = useMemo(
    () => <AssetIcon size='sm' {...assetIdOrIconSrcProps} />,
    [assetIdOrIconSrcProps],
  )

  const onClick = useCallback(
    () => history.push(generatePath('/wallet/accounts/:accountId/:assetId', filter)),
    [history, filter],
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
        fontSize={fontSizeProps}
        leftIcon={AccountEntryRowLeftIcon}
        onClick={onClick}
        {...buttonProps}
      >
        <Stack alignItems='flex-start' spacing={0} flex={1}>
          <RawText color='var(--chakra-colors-chakra-body-text)'>{title}</RawText>
          <RawText fontSize='sm' color='text.subtle'>
            {subtitle}
          </RawText>
        </Stack>
        <Flex flex={1} justifyContent='flex-end' display={flexDisplayProps} gap={2}>
          <Amount.Crypto value={cryptoBalance} symbol={symbol ?? ''} />
          {asset?.id && <RawText color='text.subtle'>{middleEllipsis(asset?.id)}</RawText>}
        </Flex>
        <Flex flex={1} justifyContent='flex-end' alignItems='flex-end' direction='column'>
          <Amount.Fiat value={fiatBalance} />
          <Amount.Crypto
            value={cryptoBalance}
            symbol={symbol ?? ''}
            fontSize='sm'
            display={cryptoDisplayProps}
          />
        </Flex>
      </Button>
    </ListItem>
  )
}
