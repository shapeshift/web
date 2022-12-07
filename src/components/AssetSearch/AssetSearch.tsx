import { SearchIcon } from '@chakra-ui/icons'
import type { BoxProps, InputProps } from '@chakra-ui/react'
import { Box, Input, InputGroup, InputLeftElement, SlideFade } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { debounce } from 'lodash'
import intersection from 'lodash/intersection'
import orderBy from 'lodash/orderBy'
import uniq from 'lodash/uniq'
import type { FC, FormEvent } from 'react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { useHistory } from 'react-router'
import { Card } from 'components/Card/Card'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import {
  selectAssetsByMarketCap,
  selectChainIdsByMarketCap,
  selectMarketDataSortedByMarketCap,
  selectPortfolioFiatBalances,
  selectPortfolioFiatBalancesByAccount,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AssetList } from './AssetList'
import { ChainList } from './Chains/ChainList'
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
  onClick?: (asset: Asset) => void
  filterBy?: (asset: Asset[]) => Asset[] | undefined
  sortOrder?: AssetSearchOrder
  disableUnsupported?: boolean
  accountId?: AccountId
  assetListAsDropdown?: boolean
  hideZeroBalanceAmounts?: boolean
  formProps?: BoxProps
}

export const AssetSearch: FC<AssetSearchProps> = ({
  onClick,
  filterBy,
  disableUnsupported,
  sortOrder = AssetSearchOrder.UserBalanceMarketCap,
  accountId,
  assetListAsDropdown,
  hideZeroBalanceAmounts,
  formProps,
}) => {
  const translate = useTranslate()
  const history = useHistory()
  const assets = useSelector(selectAssetsByMarketCap)
  const portfolioFiatBalances = useSelector(selectPortfolioFiatBalances)
  const portfolioFiatBalancesByAccount = useSelector(selectPortfolioFiatBalancesByAccount)
  const chainIdsByMarketCap = useSelector(selectChainIdsByMarketCap)
  const [activeChain, setActiveChain] = useState<ChainId | 'All'>('All')

  const assetsBySelectedChain = useMemo(
    () => (activeChain === 'All' ? assets : assets.filter(a => a.chainId === activeChain)),
    [activeChain, assets],
  )

  /**
   * the initial list of assets to display in the search results, without search terms
   * or filters applied
   */
  const inputAssets = useMemo(() => filterBy?.(assets) ?? assets, [assets, filterBy])

  /**
   * assets filtered by selected chain ids
   */
  const filteredAssets = useMemo(
    () => (filterBy ? filterBy(assetsBySelectedChain) : assetsBySelectedChain) ?? [],
    [filterBy, assetsBySelectedChain],
  )

  const [isFocused, setIsFocused] = useState(false)
  const debounceBlur = debounce(() => setIsFocused(false), 150)

  // If a custom click handler isn't provided navigate to the asset's page
  const defaultClickHandler = (asset: Asset) => {
    // AssetId has a `/` separator so the router will have to parse 2 variables
    // e.g., /assets/:chainId/:assetSubId
    const url = `/assets/${asset.assetId}`
    history.push(url)
    setIsFocused(false)
  }

  const handleClick = onClick ?? defaultClickHandler

  const marketData = useAppSelector(selectMarketDataSortedByMarketCap)
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
  }, [searchString, searching, sortedAssets])

  const listAssets = searching ? searchTermAssets : sortedAssets

  /**
   * display a list of chain icon filters, based on a unique list of chain ids,
   * derived from the output of the filterBy function, sorted by market cap
   */
  const filteredChainIdsByMarketCap: ChainId[] = useMemo(
    () => intersection(chainIdsByMarketCap, uniq(inputAssets.map(a => a.chainId))),
    [chainIdsByMarketCap, inputAssets],
  )

  const inputProps: InputProps = {
    ...register('search'),
    type: 'text',
    placeholder: translate('common.searchAsset'),
    pl: 10,
    variant: 'filled',
    autoComplete: 'off',
    ...(() =>
      assetListAsDropdown
        ? { onBlur: debounceBlur, onFocus: () => setIsFocused(true) }
        : { autoFocus: true })(),
  }

  const handleChainClick = useCallback(
    (e: React.MouseEvent) => (chainId: ChainId | 'All') => {
      e.preventDefault()
      return setActiveChain(chainId)
    },
    [],
  )

  const searchElement: JSX.Element = (
    <Box
      as='form'
      mb={3}
      px={4}
      visibility='visible'
      onSubmit={(e: FormEvent<unknown>) => e.preventDefault()}
      {...formProps}
    >
      <InputGroup size='lg'>
        {/* Override zIndex to prevent element displaying on overlay components */}
        <InputLeftElement pointerEvents='none' zIndex={1}>
          <SearchIcon color='gray.300' />
        </InputLeftElement>
        <Input {...inputProps} />
      </InputGroup>
    </Box>
  )

  const assetSearchWithAssetList: JSX.Element = (
    <>
      <ChainList
        chainIds={filteredChainIdsByMarketCap}
        onClick={handleChainClick}
        activeChain={activeChain}
      />
      {searchElement}
      {listAssets && (
        <Box flex={1}>
          <AssetList
            mb='10'
            assets={listAssets}
            handleClick={handleClick}
            disableUnsupported={disableUnsupported}
          />
        </Box>
      )}
    </>
  )

  const assetSearchWithAssetDropdown: JSX.Element = (
    <Box position='relative' maxWidth='xl'>
      {searchElement}
      {isFocused && (
        <SlideFade in={isFocused}>
          <Card position='absolute' width='100%' mt={2} zIndex='banner'>
            <Card.Body p={2} px={0}>
              <Box flex={1} height={300}>
                <AssetList
                  mb='10'
                  assets={listAssets}
                  handleClick={handleClick}
                  hideZeroBalanceAmounts={hideZeroBalanceAmounts}
                />
              </Box>
            </Card.Body>
          </Card>
        </SlideFade>
      )}
    </Box>
  )

  return assetListAsDropdown ? assetSearchWithAssetDropdown : assetSearchWithAssetList
}
