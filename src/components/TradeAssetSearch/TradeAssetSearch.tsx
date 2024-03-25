import { ChevronDownIcon, SearchIcon } from '@chakra-ui/icons'
import type { BoxProps, InputProps } from '@chakra-ui/react'
import { Flex, Input, InputGroup, InputLeftElement, Stack } from '@chakra-ui/react'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { type Asset, KnownChainIds } from '@shapeshiftoss/types'
import type { FC, FormEvent } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { AssetMenuButton } from 'components/AssetSelection/components/AssetMenuButton'
import { AllChainMenu } from 'components/ChainMenu'
import { sortChainIdsByDisplayName } from 'lib/utils'
import {
  selectPortfolioFungibleAssetsSortedByBalance,
  selectWalletSupportedChainIds,
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

export type TradeAssetSearchProps = {
  onAssetClick?: (asset: Asset) => void
  formProps?: BoxProps
  allowWalletUnsupportedAssets?: boolean
}
export const TradeAssetSearch: FC<TradeAssetSearchProps> = ({
  onAssetClick,
  formProps,
  allowWalletUnsupportedAssets,
}) => {
  const translate = useTranslate()
  const history = useHistory()
  const [activeChainId, setActiveChainId] = useState<ChainId | 'All'>('All')

  const portfolioAssetsSortedByBalance = useAppSelector(
    selectPortfolioFungibleAssetsSortedByBalance,
  )
  const walletSupportedChainIds = useAppSelector(selectWalletSupportedChainIds)

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
    const unfilteredPopularAssets = popularAssetsByChainId?.[activeChainId] ?? []
    if (allowWalletUnsupportedAssets) return unfilteredPopularAssets
    return unfilteredPopularAssets.filter(asset => walletSupportedChainIds.includes(asset.chainId))
  }, [activeChainId, popularAssetsByChainId, walletSupportedChainIds, allowWalletUnsupportedAssets])

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

  const chainIds: (ChainId | 'All')[] = useMemo(() => {
    const unsortedChainIds = (() => {
      if (allowWalletUnsupportedAssets) {
        return Object.values(KnownChainIds)
      }

      return walletSupportedChainIds
    })()

    const sortedChainIds = sortChainIdsByDisplayName(unsortedChainIds)

    return ['All', ...sortedChainIds]
  }, [walletSupportedChainIds, allowWalletUnsupportedAssets])

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
      <Stack
        gap={4}
        px={4}
        pb={4}
        as='form'
        visibility='visible'
        borderBottomWidth={1}
        borderColor='border.base'
        onSubmit={handleSubmit}
        {...formProps}
      >
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
      {isSearching ? (
        <SearchTermAssetList
          activeChainId={activeChainId}
          searchString={searchString}
          onAssetClick={handleAssetClick}
          isLoading={isPopularAssetIdsLoading}
          allowWalletUnsupportedAssets={allowWalletUnsupportedAssets}
        />
      ) : (
        <DefaultAssetList
          portfolioAssetsSortedByBalance={portfolioAssetsSortedByBalanceForChain}
          popularAssets={popularAssets}
          onAssetClick={handleAssetClick}
        />
      )}
    </>
  )
}
