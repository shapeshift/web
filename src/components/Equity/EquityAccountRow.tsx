import { Avatar } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { generatePath, useHistory } from 'react-router-dom'
import { AccountsIcon } from 'components/Icons/Accounts'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { accountIdToFeeAssetId } from 'state/slices/portfolioSlice/utils'
import {
  selectAssetById,
  selectMarketDataById,
  selectPortfolioAccountMetadata,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { EquityRow } from './EquityRow'

// This can maybe be combined with the other AccountRow component once we know how the data works
// src/components/AccountRow
// Link url should be the account page /Accounts/[account] or whatever the route is

type EquityAccountRowProps = {
  accountId: AccountId
  assetId: AssetId
  allocation?: string
  color?: string
}

export const EquityAccountRow = ({
  accountId,
  assetId,
  allocation,
  color,
}: EquityAccountRowProps) => {
  const translate = useTranslate()
  const history = useHistory()
  const feeAssetId = accountIdToFeeAssetId(accountId)
  const rowAssetId = assetId ? assetId : feeAssetId
  const asset = useAppSelector(state => selectAssetById(state, rowAssetId ?? ''))
  const marketData = useAppSelector(state => selectMarketDataById(state, rowAssetId ?? ''))

  const accountMetadata = useSelector(selectPortfolioAccountMetadata)

  const accountNumber: number | undefined = useMemo(
    () => accountId && accountMetadata[accountId]?.bip44Params?.accountNumber,
    [accountId, accountMetadata],
  )

  const filter = useMemo(() => ({ assetId: rowAssetId, accountId }), [rowAssetId, accountId])
  const cryptoHumanBalance = bnOrZero(
    useAppSelector(state => selectPortfolioCryptoPrecisionBalanceByFilter(state, filter)),
  ).toString()
  const fiatBalance = useMemo(() => {
    return bnOrZero(cryptoHumanBalance).times(marketData.price).toString()
  }, [cryptoHumanBalance, marketData.price])
  const path = generatePath(
    assetId ? '/accounts/:accountId/:assetId' : '/accounts/:accountId',
    filter,
  )

  const handleClick = useCallback(() => {
    history.push(path)
  }, [history, path])

  if (!asset) return null
  return (
    <EquityRow
      onClick={handleClick}
      icon={
        <Avatar
          bg={`${asset.color}30`}
          color={asset.color}
          size='sm'
          borderRadius='lg'
          icon={<AccountsIcon boxSize='18px' />}
        />
      }
      label={translate('accounts.accountNumber', { accountNumber })}
      allocation={allocation}
      color={color}
      fiatAmount={fiatBalance}
      cryptoBalancePrecision={cryptoHumanBalance}
      symbol={asset.symbol}
      subText={translate('common.wallet')}
    />
  )
}
