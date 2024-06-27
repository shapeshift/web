import { type ChainId, ethChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import axios, { type AxiosRequestConfig } from 'axios'
import { useMemo } from 'react'
import { assertGetEvmChainAdapter } from 'lib/utils/evm'
import {
  selectAssetsSortedByName,
  selectWalletConnectedChainIds,
} from 'state/slices/common-selectors'
import { useAppSelector } from 'state/store'

import { filterAssetsBySearchTerm } from '../helpers/filterAssetsBySearchTerm/filterAssetsBySearchTerm'
import { GroupedAssetList } from './GroupedAssetList/GroupedAssetList'

interface Logo {
  uri: string
  width: number
  height: number
}

interface Url {
  name: string
  url: string
}

interface TokenMetadata {
  contract_address: string
  decimals: number
  name: string
  symbol: string
  total_supply: string
  logos: Logo[]
  urls: Url[]
  current_usd_price: number
}

const CHAINBASE_BASE_URL = 'https://api.chainbase.online/v1'
const CHAINBASE_API_KEY = 'demo' // FIXME: Replace with real API key

const getTokenMetadata = async (contractAddress: string): Promise<TokenMetadata> => {
  const url = `${CHAINBASE_BASE_URL}/token/metadata?contract_address=${contractAddress}`

  const config: AxiosRequestConfig = {
    headers: {
      accept: 'application/json',
      'x-api-key': CHAINBASE_API_KEY,
    },
  }

  try {
    const response = await axios.get<TokenMetadata>(url, config)
    return response.data
  } catch (error) {
    console.error('Error fetching token metadata:', error)
    throw error
  }
}

export type SearchTermAssetListProps = {
  isLoading: boolean
  activeChainId: ChainId | 'All'
  searchString: string
  allowWalletUnsupportedAssets: boolean | undefined
  onAssetClick: (asset: Asset) => void
}

export const SearchTermAssetList = ({
  isLoading,
  activeChainId,
  searchString,
  allowWalletUnsupportedAssets,
  onAssetClick,
}: SearchTermAssetListProps) => {
  const assets = useAppSelector(selectAssetsSortedByName)
  const groupIsLoading = useMemo(() => {
    return [Boolean(isLoading)]
  }, [isLoading])

  const walletConnectedChainIds = useAppSelector(selectWalletConnectedChainIds)

  const assetsForChain = useMemo(() => {
    if (activeChainId === 'All') {
      if (allowWalletUnsupportedAssets) return assets
      return assets.filter(asset => walletConnectedChainIds.includes(asset.chainId))
    }

    // Should never happen, but paranoia.
    if (!allowWalletUnsupportedAssets && !walletConnectedChainIds.includes(activeChainId)) return []

    return assets.filter(asset => asset.chainId === activeChainId)
  }, [activeChainId, allowWalletUnsupportedAssets, assets, walletConnectedChainIds])

  // don't async this - use useEffect
  const searchTermAssets = useMemo(async () => {
    const ethChainAdapter = assertGetEvmChainAdapter(ethChainId)
    const isTokenAddress = (await ethChainAdapter.validateAddress(searchString)).valid
    const tokenMetadata = isTokenAddress ? getTokenMetadata(searchString) : undefined
    console.log(tokenMetadata)

    return filterAssetsBySearchTerm(searchString, assetsForChain)
  }, [searchString, assetsForChain])

  const { groups, groupCounts } = useMemo(async () => {
    return {
      groups: ['modals.assetSearch.searchResults'],
      groupCounts: [searchTermAssets.length],
    }
  }, [searchTermAssets.length])

  return (
    <GroupedAssetList
      assets={searchTermAssets}
      groups={groups}
      groupCounts={groupCounts}
      hideZeroBalanceAmounts={true}
      groupIsLoading={groupIsLoading}
      onAssetClick={onAssetClick}
    />
  )
}
