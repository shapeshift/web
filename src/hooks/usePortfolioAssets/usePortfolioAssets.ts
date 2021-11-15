import { CAIP19 } from '@shapeshiftoss/caip'
import { Asset, NetworkTypes } from '@shapeshiftoss/types'
import isEmpty from 'lodash/isEmpty'
import { useCallback, useEffect, useState } from 'react'
import { useCAIP19Balances } from 'hooks/useBalances/useCAIP19Balances'
import { getAssetService } from 'lib/assetService'

export const usePortfolioAssets = () => {
  const [portfolioAssets, setPortfolioAssets] = useState<{ [k: CAIP19]: Asset }>({})
  const [portfolioAssetsLoading, setPortfolioAssetsLoading] = useState<boolean>(true)
  const { balances, loading: balancesLoading } = useCAIP19Balances()

  const getPortfolioAssets = useCallback(async () => {
    const assetService = await getAssetService()
    const assets = assetService.byNetwork(NetworkTypes.MAINNET)
    const portfolioAssets = Object.keys(balances).reduce<{ [k: CAIP19]: Asset }>((acc, caip19) => {
      const a = assets.find(asset => asset.caip19 === caip19.toLowerCase())
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
