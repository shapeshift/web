import { SearchIcon } from '@chakra-ui/icons'
import type { BoxProps, InputProps } from '@chakra-ui/react'
import { Box, Input, InputGroup, InputLeftElement } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { isNft } from '@shapeshiftoss/caip'
import intersection from 'lodash/intersection'
import uniq from 'lodash/uniq'
import type { FC, FormEvent } from 'react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { useHistory } from 'react-router'
import type { Asset } from 'lib/asset-service'
import {
  selectAssetsSortedByMarketCapUserCurrencyBalanceAndName,
  selectChainIdsByMarketCap,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AssetList } from './AssetList'
import { ChainList } from './Chains/ChainList'
import { filterAssetsBySearchTerm } from './helpers/filterAssetsBySearchTerm/filterAssetsBySearchTerm'
export type AssetSearchProps = {
  assets?: Asset[]
  onClick?: (asset: Asset) => void
  disableUnsupported?: boolean
  formProps?: BoxProps
}
export const AssetSearch: FC<AssetSearchProps> = ({
  assets: selectedAssets,
  onClick,
  disableUnsupported,
  formProps,
}) => {
  const translate = useTranslate()
  const history = useHistory()
  const chainIdsByMarketCap = useSelector(selectChainIdsByMarketCap)
  const [activeChain, setActiveChain] = useState<ChainId | 'All'>('All')
  const assets = useAppSelector(
    state => selectedAssets ?? selectAssetsSortedByMarketCapUserCurrencyBalanceAndName(state),
  )
  /**
   * assets filtered by selected chain ids
   */
  const filteredAssets = useMemo(
    () =>
      activeChain === 'All'
        ? assets.filter(a => !isNft(a.assetId))
        : assets.filter(a => a.chainId === activeChain && !isNft(a.assetId)),
    [activeChain, assets],
  )
  // If a custom click handler isn't provided navigate to the asset's page
  const defaultClickHandler = useCallback(
    (asset: Asset) => {
      // AssetId has a `/` separator so the router will have to parse 2 variables
      // e.g., /assets/:chainId/:assetSubId
      const url = `/assets/${asset.assetId}`
      history.push(url)
    },
    [history],
  )
  const handleClick = onClick ?? defaultClickHandler
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
    if (filteredAssets) {
      setSearchTermAssets(
        searching ? filterAssetsBySearchTerm(searchString, filteredAssets) : filteredAssets,
      )
    }
  }, [searchString, searching, filteredAssets])
  const listAssets = searching ? searchTermAssets : filteredAssets
  /**
   * display a list of chain icon filters, based on a unique list of chain ids,
   * derived from the output of the filterBy function, sorted by market cap
   */
  const filteredChainIdsByMarketCap: ChainId[] = useMemo(
    () => intersection(chainIdsByMarketCap, uniq(assets.map(a => a.chainId))),
    [chainIdsByMarketCap, assets],
  )
  const inputProps: InputProps = useMemo(
    () => ({
      ...register('search'),
      type: 'text',
      placeholder: translate('common.searchAsset'),
      pl: 10,
      variant: 'filled',
      autoComplete: 'off',
      autoFocus: true,
    }),
    [register, translate],
  )
  const handleChainClick = useCallback(
    (e: React.MouseEvent) => (chainId: ChainId | 'All') => {
      e.preventDefault()
      return setActiveChain(chainId)
    },
    [],
  )

  const handleSubmit = useCallback((e: FormEvent<unknown>) => e.preventDefault(), [])

  return (
    <>
      <ChainList
        chainIds={filteredChainIdsByMarketCap}
        onClick={handleChainClick}
        activeChain={activeChain}
      />
      <Box as='form' mb={3} px={4} visibility='visible' onSubmit={handleSubmit} {...formProps}>
        <InputGroup size='lg'>
          {/* Override zIndex to prevent element displaying on overlay components */}
          <InputLeftElement pointerEvents='none' zIndex={1}>
            <SearchIcon color='gray.300' />
          </InputLeftElement>
          <Input {...inputProps} />
        </InputGroup>
      </Box>
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
}
