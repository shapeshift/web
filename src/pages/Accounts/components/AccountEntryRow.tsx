import type { ButtonProps } from '@chakra-ui/react'
import { Button, Flex, ListItem, Stack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { generatePath, useNavigate } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { RawText } from '@/components/Text'
import { middleEllipsis } from '@/lib/utils'
import { isUtxoAccountId } from '@/lib/utils/utxo'
import { selectPortfolioUserCurrencyBalanceByFilter } from '@/state/slices/portfolioSlice/selectors'
import { accountIdToLabel } from '@/state/slices/portfolioSlice/utils'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type AccountEntryRowProps = {
  accountId: AccountId
  assetId: AssetId
  showNetworkIcon?: boolean
  maximumFractionDigits?: number
} & ButtonProps

const fontSizeProps = { base: 'sm', md: 'md' }
const flexDisplayProps = { base: 'none', md: 'flex' }
const cryptoDisplayProps = { base: 'block', md: 'none' }
const titleMaxWidthProps = { base: '100%', md: 'auto' }

export const AccountEntryRow: React.FC<AccountEntryRowProps> = ({
  accountId,
  assetId,
  showNetworkIcon,
  maximumFractionDigits,
  ...buttonProps
}) => {
  const navigate = useNavigate()
  const translate = useTranslate()
  const filter = useMemo(() => ({ assetId, accountId }), [accountId, assetId])
  const accountNumber = useAppSelector(s => selectAccountNumberByAccountId(s, filter))
  const asset = useAppSelector(s => selectAssetById(s, assetId))
  const cryptoBalanceFilter = useMemo(() => ({ accountId, assetId }), [accountId, assetId])
  const cryptoBalance = useAppSelector(state =>
    selectPortfolioCryptoPrecisionBalanceByFilter(state, cryptoBalanceFilter),
  )
  const userCurrencyBalanceFilter = useMemo(() => ({ accountId, assetId }), [accountId, assetId])
  const userCurrencyBalance = useAppSelector(state =>
    selectPortfolioUserCurrencyBalanceByFilter(state, userCurrencyBalanceFilter),
  )
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
      assetId
        ? { assetId, name: title, showNetworkIcon }
        : { src: icon, name: title, showNetworkIcon, bg: asset?.color },
    [assetId, icon, title, asset?.color, showNetworkIcon],
  )

  const AccountEntryRowLeftIcon = useMemo(
    () => <AssetIcon size='sm' {...assetIdOrIconSrcProps} />,
    [assetIdOrIconSrcProps],
  )

  const onClick = useCallback(
    () => navigate(generatePath('/wallet/accounts/:accountId/:assetId', filter)),
    [navigate, filter],
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
        <Stack alignItems='flex-start' spacing={0} flex={1} minW={0}>
          <RawText
            color='var(--chakra-colors-chakra-body-text)'
            textOverflow='ellipsis'
            overflow='hidden'
            whiteSpace='nowrap'
            maxWidth={titleMaxWidthProps}
          >
            {title}
          </RawText>
          <RawText fontSize='sm' color='text.subtle'>
            {subtitle}
          </RawText>
        </Stack>
        <Flex flex={1} justifyContent='flex-end' display={flexDisplayProps} gap={2}>
          <Amount.Crypto value={cryptoBalance} symbol={symbol ?? ''} />
          {asset?.id && <RawText color='text.subtle'>{middleEllipsis(asset?.id)}</RawText>}
        </Flex>
        <Flex
          className='account-entry-row__amounts'
          flex={1}
          justifyContent='flex-end'
          alignItems='flex-end'
          direction='column'
        >
          <Amount.Fiat value={userCurrencyBalance} />
          <Amount.Crypto
            value={cryptoBalance}
            symbol={symbol ?? ''}
            fontSize='sm'
            display={cryptoDisplayProps}
            maximumFractionDigits={maximumFractionDigits}
          />
        </Flex>
      </Button>
    </ListItem>
  )
}
