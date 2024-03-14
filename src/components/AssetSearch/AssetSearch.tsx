import { ChevronDownIcon, SearchIcon } from '@chakra-ui/icons'
import type { BoxProps, InputProps } from '@chakra-ui/react'
import { Flex, Input, InputGroup, InputLeftElement, ModalHeader, Stack } from '@chakra-ui/react'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { type Asset, KnownChainIds } from '@shapeshiftoss/types'
import uniq from 'lodash/uniq'
import type { FC, FormEvent } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { AssetMenuButton } from 'components/AssetSelection/components/AssetMenuButton'
import { AllChainMenu } from 'components/ChainMenu'
import {
  selectAssetsSortedByMarketCapUserCurrencyBalanceAndName,
  selectPortfolioFungibleAssetsSortedByBalance,
  selectPortfolioLoading,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { DefaultAssetList } from './components/DefaultAssetList'
import { SearchTermAssetList } from './components/SearchTermAssetList'
import { useGetPopularAssetsQuery } from './hooks/useGetPopularAssetsQuery'

const buttonProps = {
  rightIcon: <ChevronDownIcon />,
}

const assetButtonProps = {
  justifyContent: 'flex-end',
  pl: 1.5,
  pr: 3,
  py: 1.5,
  size: 'sm',
  borderRadius: 'full',
  height: 'auto',
}

const NUM_QUICK_ACCESS_ASSETS = 5

export type AssetSearchProps = {
  assets?: Asset[]
  onAssetClick?: (asset: Asset) => void
  formProps?: BoxProps
}
export const AssetSearch: FC<AssetSearchProps> = ({
  assets: selectedAssets,
  onAssetClick,
  formProps,
}) => {
  const translate = useTranslate()
  const history = useHistory()
  const [activeChainId, setActiveChainId] = useState<ChainId | 'All'>('All')
  const assets = useAppSelector(
    state => selectedAssets ?? selectAssetsSortedByMarketCapUserCurrencyBalanceAndName(state),
  )
  const portfolioAssetsSortedByBalance = useAppSelector(
    selectPortfolioFungibleAssetsSortedByBalance,
  )
  const isPortfolioLoading = useAppSelector(selectPortfolioLoading)

  const { data: popularAssetsByChainId, isLoading: isPopularAssetIdsLoading } =
    useGetPopularAssetsQuery()

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
  const handleAssetClick = onAssetClick ?? defaultClickHandler
  const { register, watch } = useForm<{ search: string }>({
    mode: 'onChange',
    defaultValues: {
      search: '',
    },
  })
  const searchString = watch('search').trim()
  const isSearching = useMemo(() => searchString.length > 0, [searchString])

  const chainIds: ChainId[] = useMemo(() => ['All', ...uniq(assets.map(a => a.chainId))], [assets])
  const inputProps: InputProps = useMemo(
    () => ({
      ...register('search'),
      type: 'text',
      placeholder: translate('common.searchAsset'),
      pl: 10,
      variant: 'filled',
      borderWidth: 0,
      autoComplete: 'off',
      autoFocus: true,
    }),
    [register, translate],
  )

  const handleSubmit = useCallback((e: FormEvent<unknown>) => e.preventDefault(), [])

  const popularAssets = useMemo(() => {
    return popularAssetsByChainId?.[activeChainId] ?? []
  }, [activeChainId, popularAssetsByChainId])

  const quickAccessAssets = useMemo(() => {
    if (activeChainId !== 'All') {
      return popularAssets.slice(0, 5)
    }

    // if we selected 'All' chains, we'll dedupe EVM assets in favor of ethereum mainnet
    const resultMap: Record<AssetId, Asset> = {}
    for (const asset of popularAssets) {
      if (Object.keys(resultMap).length === NUM_QUICK_ACCESS_ASSETS) {
        break
      }

      const key = asset.relatedAssetKey ?? asset.assetId

      // set first occurrence, overwrite if eth mainnet
      if (resultMap[key] === undefined || asset.chainId === KnownChainIds.EthereumMainnet) {
        resultMap[key] = asset
      }
    }

    return Object.values(resultMap)
  }, [activeChainId, popularAssets])

  const portfolioAssetsSortedByBalanceForChain = useMemo(() => {
    if (activeChainId === 'All') {
      return portfolioAssetsSortedByBalance
    }

    return portfolioAssetsSortedByBalance.filter(asset => asset.chainId === activeChainId)
  }, [activeChainId, portfolioAssetsSortedByBalance])

  const quickAccessAssetButtons = useMemo(() => {
    if (isPopularAssetIdsLoading) {
      return Array(NUM_QUICK_ACCESS_ASSETS)
        .fill(null)
        .map((_, i) => {
          return <AssetMenuButton key={i} isLoading isDisabled buttonProps={assetButtonProps} />
        })
    }

    return quickAccessAssets.map(({ assetId }) => {
      return (
        <AssetMenuButton
          key={assetId}
          assetId={assetId}
          onAssetClick={handleAssetClick}
          buttonProps={assetButtonProps}
          isLoading={isPopularAssetIdsLoading}
          isDisabled={false}
          showNetworkIcon
        />
      )
    })
  }, [handleAssetClick, isPopularAssetIdsLoading, quickAccessAssets])

  return (
    <>
      <ModalHeader pt={0} borderBottomWidth={1} borderColor='border.base'>
        <Stack gap={4} as='form' visibility='visible' onSubmit={handleSubmit} {...formProps}>
          <Flex gap={2} alignItems='center'>
            <InputGroup>
              {/* Override zIndex to prevent element displaying on overlay components */}
              <InputLeftElement pointerEvents='none' zIndex={1}>
                <SearchIcon color='gray.300' />
              </InputLeftElement>
              <Input {...inputProps} />
            </InputGroup>
            <AllChainMenu
              activeChainId={activeChainId}
              chainIds={chainIds}
              isActiveChainIdSupported={true}
              isDisabled={false}
              onMenuOptionClick={setActiveChainId}
              buttonProps={buttonProps}
              disableTooltip
            />
          </Flex>
          <Flex flexWrap='wrap' gap={2}>
            {quickAccessAssetButtons}
          </Flex>
        </Stack>
      </ModalHeader>
      {isSearching ? (
        <SearchTermAssetList
          activeChainId={activeChainId}
          searchString={searchString}
          onAssetClick={handleAssetClick}
          isLoading={isPopularAssetIdsLoading}
        />
      ) : (
        <DefaultAssetList
          portfolioAssetsSortedByBalance={portfolioAssetsSortedByBalanceForChain}
          popularAssets={popularAssets}
          onAssetClick={handleAssetClick}
          isPopularAssetIdsLoading={isPopularAssetIdsLoading}
          isPortfolioLoading={isPortfolioLoading}
        />
      )}
    </>
  )
}
