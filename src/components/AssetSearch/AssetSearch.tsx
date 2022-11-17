import { SearchIcon } from '@chakra-ui/icons'
import { Box, Input, InputGroup, InputLeftElement } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId } from '@shapeshiftoss/caip'
import orderBy from 'lodash/orderBy'
import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import {
  selectAssetsByMarketCap,
  selectMarketData,
  selectPortfolioFiatBalances,
  selectPortfolioFiatBalancesByAccount,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AssetList } from './AssetList'
import { filterAssetsBySearchTerm } from './helpers/filterAssetsBySearchTerm/filterAssetsBySearchTerm'

const moduleLogger = logger.child({
  namespace: ['AssetSearch'],
})

export enum AssetSearchOrder {
  MarketCap = 'marketCap',
  UserBalance = 'userBalance',
  UserBalanceMarketCap = 'userBalanceMarketCap',
  Volume = 'volume',
  ChangePercent24h = 'changePercent24h',
}

export type AssetSearchProps = {
  onClick: (asset: Asset) => void
  filterBy?: (asset: Asset[]) => Asset[] | undefined
  sortOrder?: AssetSearchOrder
  disableUnsupported?: boolean
  accountId?: AccountId
}

export const AssetSearch = ({
  onClick,
  filterBy,
  disableUnsupported,
  sortOrder = AssetSearchOrder.UserBalanceMarketCap,
  accountId,
}: AssetSearchProps) => {
  const translate = useTranslate()
  const assets = useSelector(selectAssetsByMarketCap)
  const portfolioFiatBalances = useSelector(selectPortfolioFiatBalances)
  const portfolioFiatBalancesByAccount = useSelector(selectPortfolioFiatBalancesByAccount)
  const filteredAssets = useMemo(
    () => (filterBy ? filterBy(assets) : assets) ?? [],
    [assets, filterBy],
  )

  const marketData = useAppSelector(selectMarketData)
  const sortedAssets = useMemo(() => {
    const selectAssetFiatBalance = (asset: Asset) =>
      bnOrZero(
        accountId
          ? portfolioFiatBalancesByAccount[accountId][asset.assetId]
          : portfolioFiatBalances[asset.assetId],
      ).toNumber()
    const selectAssetMarketCap = (asset: Asset) =>
      bnOrZero(marketData[asset.assetId]?.marketCap).toNumber()
    const selectAssetVolume = (asset: Asset) =>
      bnOrZero(marketData[asset.assetId]?.volume).toNumber()
    const selectAssetChangePercent24Hr = (asset: Asset) =>
      bnOrZero(marketData[asset.assetId]?.changePercent24Hr).toNumber()
    const selectAssetName = (asset: Asset) => asset.name

    switch (sortOrder) {
      case AssetSearchOrder.MarketCap:
        return orderBy(filteredAssets, [selectAssetMarketCap, selectAssetName], ['desc', 'asc'])
      case AssetSearchOrder.Volume:
        return orderBy(filteredAssets, [selectAssetVolume, selectAssetName], ['desc', 'asc'])
      case AssetSearchOrder.ChangePercent24h:
        return orderBy(
          filteredAssets,
          [selectAssetChangePercent24Hr, selectAssetName],
          ['desc', 'asc'],
        )
      case AssetSearchOrder.UserBalance:
        return orderBy(filteredAssets, [selectAssetFiatBalance, selectAssetName], ['desc', 'asc'])
      case AssetSearchOrder.UserBalanceMarketCap:
        return orderBy(
          filteredAssets,
          [selectAssetFiatBalance, selectAssetMarketCap, selectAssetName],
          ['desc', 'desc', 'asc'],
        )
      default:
        return filteredAssets
    }
  }, [
    accountId,
    filteredAssets,
    marketData,
    portfolioFiatBalances,
    portfolioFiatBalancesByAccount,
    sortOrder,
  ])
  const [searchTermAssets, setSearchTermAssets] = useState<Asset[]>([])
  const { register, watch } = useForm<{ search: string }>({
    mode: 'onChange',
    defaultValues: {
      search: '',
    },
  })

  const searchString = watch('search')
  const searching = useMemo(() => searchString.length > 0, [searchString])

  useEffect(() => {
    if (sortedAssets) {
      setSearchTermAssets(
        searching ? filterAssetsBySearchTerm(searchString, sortedAssets) : sortedAssets,
      )
    } else {
      moduleLogger.error('sortedAssets not defined')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchString])

  const listAssets = searching ? searchTermAssets : sortedAssets

  return (
    <>
      <Box
        as='form'
        mb={3}
        px={4}
        visibility='visible'
        onSubmit={(e: FormEvent<unknown>) => e.preventDefault()}
      >
        <InputGroup size='lg'>
          <InputLeftElement pointerEvents='none'>
            <SearchIcon color='gray.300' />
          </InputLeftElement>
          <Input
            {...register('search')}
            type='text'
            placeholder={translate('common.search')}
            autoFocus // eslint-disable-line jsx-a11y/no-autofocus
            pl={10}
            variant='filled'
            autoComplete='off'
          />
        </InputGroup>
      </Box>
      {listAssets && (
        <Box flex={1}>
          <AssetList
            mb='10'
            assets={listAssets}
            handleClick={onClick}
            disableUnsupported={disableUnsupported}
          />
        </Box>
      )}
    </>
  )
}
