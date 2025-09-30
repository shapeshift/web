import { SearchIcon } from '@chakra-ui/icons'
import type { BoxProps, InputProps } from '@chakra-ui/react'
import { Box, Input, InputGroup, InputLeftElement } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { isNft } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import uniq from 'lodash/uniq'
import type { FC, FormEvent } from 'react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { AssetList } from './components/AssetList'

import { ChainList } from '@/components/TradeAssetSearch/Chains/ChainList'
import { searchAssets } from '@/lib/assetSearch'
import { sortChainIdsByDisplayName } from '@/lib/utils'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectWalletConnectedChainIds } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const minHeight = { base: '100%', md: '400px' }

export type AssetSearchProps = {
  assets: Asset[]
  onAssetClick?: (asset: Asset) => void
  formProps?: BoxProps
  allowWalletUnsupportedAssets?: boolean
  showRelatedAssets?: boolean
}
export const AssetSearch: FC<AssetSearchProps> = ({
  assets,
  onAssetClick,
  formProps,
  allowWalletUnsupportedAssets,
  showRelatedAssets,
}) => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const [activeChain, setActiveChain] = useState<ChainId | 'All'>('All')
  const walletConnectedChainIds = useAppSelector(selectWalletConnectedChainIds)
  const spamMarkedAssetIds = useAppSelector(preferences.selectors.selectSpamMarkedAssetIds)

  const supportedAssets = useMemo(() => {
    const fungibleAssets = assets.filter(asset => !isNft(asset.assetId))

    // Filter out spam-marked assets from search results
    const nonSpamAssets = fungibleAssets.filter(
      asset => !spamMarkedAssetIds.includes(asset.assetId),
    )

    if (allowWalletUnsupportedAssets) {
      return nonSpamAssets
    }

    return nonSpamAssets.filter(asset => walletConnectedChainIds.includes(asset.chainId))
  }, [allowWalletUnsupportedAssets, assets, walletConnectedChainIds, spamMarkedAssetIds])

  /**
   * assets filtered by selected chain ids
   */
  const filteredAssets = useMemo(
    () =>
      activeChain === 'All'
        ? supportedAssets
        : supportedAssets.filter(a => a.chainId === activeChain),
    [activeChain, supportedAssets],
  )
  // If a custom click handler isn't provided navigate to the asset's page
  const defaultClickHandler = useCallback(
    (asset: Asset) => {
      // AssetId has a `/` separator so the router will have to parse 2 variables
      // e.g., /assets/:chainId/:assetSubId
      const url = `/assets/${asset.assetId}`
      navigate(url)
    },
    [navigate],
  )
  const handleClick = onAssetClick ?? defaultClickHandler
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
      setSearchTermAssets(searching ? searchAssets(searchString, filteredAssets) : filteredAssets)
    }
  }, [searchString, searching, filteredAssets])
  const listAssets = searching ? searchTermAssets : filteredAssets

  const chainIds: ChainId[] = useMemo(() => {
    const unsortedChainIds = uniq(assets.map(asset => asset.chainId))
    const filteredChainIds = allowWalletUnsupportedAssets
      ? unsortedChainIds
      : unsortedChainIds.filter(chainId => walletConnectedChainIds.includes(chainId))
    const sortedChainIds = sortChainIdsByDisplayName(filteredChainIds)
    return sortedChainIds
  }, [allowWalletUnsupportedAssets, assets, walletConnectedChainIds])

  const inputProps: InputProps = useMemo(
    () => ({
      ...register('search'),
      type: 'text',
      placeholder: translate('common.searchAsset'),
      pl: 10,
      variant: 'filled',
      autoComplete: 'off',
      autoFocus: false,
      transitionProperty: 'none',
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
      <ChainList chainIds={chainIds} onClick={handleChainClick} activeChain={activeChain} />
      <Box as='form' mb={3} px={4} visibility='visible' onSubmit={handleSubmit} {...formProps}>
        <InputGroup size='lg'>
          {/* Override zIndex to prevent element displaying on overlay components */}
          <InputLeftElement pointerEvents='none' zIndex={1}>
            <SearchIcon color='gray.300' />
          </InputLeftElement>
          <Input {...inputProps} />
        </InputGroup>
      </Box>
      <Box flex={1} minHeight={minHeight}>
        <AssetList
          mb='10'
          assets={listAssets}
          handleClick={handleClick}
          disableUnsupported={!allowWalletUnsupportedAssets}
          showRelatedAssets={showRelatedAssets}
        />
      </Box>
    </>
  )
}
