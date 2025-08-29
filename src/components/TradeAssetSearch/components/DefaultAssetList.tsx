import { Box } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { useMemo } from 'react'

import { useGetPopularAssetsQuery } from '../hooks/useGetPopularAssetsQuery'

import { AssetList } from '@/components/AssetSearch/components/AssetList'
import { Text } from '@/components/Text'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { selectIsPortfolioLoading } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export type DefaultAssetListProps = {
  portfolioAssetsSortedByBalance: Asset[]
  popularAssets: Asset[]
  onAssetClick: (asset: Asset) => void
}

export const DefaultAssetList = ({
  portfolioAssetsSortedByBalance,
  popularAssets,
  onAssetClick,
}: DefaultAssetListProps) => {
  const { isConnected } = useWallet().state
  const isPortfolioLoading = useAppSelector(selectIsPortfolioLoading)
  const { isLoading: isPopularAssetIdsLoading } = useGetPopularAssetsQuery()

  const allAssets = useMemo(() => {
    return portfolioAssetsSortedByBalance.concat(popularAssets)
  }, [portfolioAssetsSortedByBalance, popularAssets])

  console.log({
    allAssets,
  })

  return (
    <>
      <Text
        color='text.subtle'
        fontWeight='medium'
        pt={4}
        px={6}
        translation={'modals.assetSearch.myAssets'}
      />
      <Box px={2}>
        <AssetList
          assets={allAssets}
          handleClick={onAssetClick}
          hideZeroBalanceAmounts={true}
          shouldDisplayRelatedAssets
          height='50vh'
          isLoading={isConnected && isPortfolioLoading && isPopularAssetIdsLoading}
        />
      </Box>
    </>
  )
}
