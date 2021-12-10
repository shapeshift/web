import { CAIP19 } from '@shapeshiftoss/caip'
import { Asset, NetworkTypes } from '@shapeshiftoss/types'
import isEmpty from 'lodash/isEmpty'
import { useCallback, useEffect, useState } from 'react'
import { useBalances } from 'hooks/useBalances/useBalances'
import { getAssetService } from 'lib/assetService'

export type PortfolioAssets = {
  [k: CAIP19]: Asset
}

export type UsePortfolioAssetsReturn = {
  portfolioAssetsLoading: boolean
  portfolioAssets: PortfolioAssets
}

export type UsePortfolioAssets = () => UsePortfolioAssetsReturn

export const usePortfolioAssets: UsePortfolioAssets = () => {
  const [portfolioAssets, setPortfolioAssets] = useState<PortfolioAssets>({})
  const [portfolioAssetsLoading, setPortfolioAssetsLoading] = useState<boolean>(true)
  // TODO(0xdef1cafe): this isn't great but it's the only way to get all accounts
  const { balances, loading: balancesLoading } = useBalances()

  const getPortfolioAssets = useCallback(async () => {
    const assetService = await getAssetService()
    const assets = assetService.byNetwork(NetworkTypes.MAINNET)
    const portfolioAssets = Object.keys(balances).reduce<PortfolioAssets>((acc, caip19) => {
      const a = assets.find(asset => asset.caip19 === caip19)
      if (!a) return acc
      acc[caip19] = a
      return acc
    }, {})
    setPortfolioAssets(portfolioAssets)
    setPortfolioAssetsLoading(false)
  }, [balances, setPortfolioAssets])

  useEffect(() => {
    if (balancesLoading) return
    if (isEmpty(balances)) return
    ;(async () => {
      await getPortfolioAssets()
    })()
  }, [getPortfolioAssets, balances, balancesLoading])

  return { portfolioAssets, portfolioAssetsLoading }
}
