import { Avatar, Button, Flex } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { generatePath, Link } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { RawText } from 'components/Text'
import { accountIdToFeeAssetId } from 'state/slices/portfolioSlice/utils'
import {
  selectAssetById,
  selectPortfolioAccountMetadata,
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectPortfolioFiatBalanceByAssetId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

// This can maybe be combined with the other AccountRow component once we know how the data works
// src/components/AccountRow
// Link url should be the account page /Accounts/[account] or whatever the route is

type EquityAccountRowProps = {
  accountId: AccountId
  assetId?: AssetId
}

export const EquityAccountRow = ({ accountId, assetId }: EquityAccountRowProps) => {
  const translate = useTranslate()
  const feeAssetId = accountIdToFeeAssetId(accountId)
  const rowAssetId = assetId ? assetId : feeAssetId
  const asset = useAppSelector(state => selectAssetById(state, rowAssetId ?? ''))

  const accountMetadata = useSelector(selectPortfolioAccountMetadata)

  const accountNumber: number | undefined = useMemo(
    () => accountId && accountMetadata[accountId]?.bip44Params?.accountNumber,
    [accountId, accountMetadata],
  )

  const filter = useMemo(() => ({ assetId: rowAssetId, accountId }), [rowAssetId, accountId])

  const cryptoHumanBalance =
    useAppSelector(s => selectPortfolioCryptoPrecisionBalanceByFilter(s, filter)) ?? '0'
  const fiatBalance = useAppSelector(s => selectPortfolioFiatBalanceByAssetId(s, filter)) ?? '0'
  const path = generatePath(
    assetId ? '/accounts/:accountId/:assetId' : '/accounts/:accountId',
    filter,
  )

  if (!asset) return null
  return (
    <Button
      variant='ghost'
      as={Link}
      to={path}
      height='auto'
      py={4}
      justifyContent='flex-start'
      alignItems='center'
      display='flex'
      gap={4}
    >
      <Avatar bg={`${asset.color}20`} color={asset.color} size='sm' name={`# ${accountNumber}`} />
      <Flex flexDir='column' alignItems='flex-start'>
        <RawText fontWeight='bold' color='chakra-body-text'>
          {translate('accounts.accountNumber', { accountNumber })}
        </RawText>
        <Flex fontWeight='medium' fontSize='sm' gap={1}>
          <Amount.Fiat value={fiatBalance} color='chakra-body-text' />
          <Amount.Crypto
            value={cryptoHumanBalance}
            symbol={asset.symbol}
            _before={{ content: "'('" }}
            _after={{ content: "')'" }}
          />
        </Flex>
      </Flex>
    </Button>
  )
}
