import { CAIP19 } from '@shapeshiftoss/caip'
import { Asset, NetworkTypes } from '@shapeshiftoss/types'
import isEmpty from 'lodash/isEmpty'
import isEqual from 'lodash/isEqual'
import { useCallback, useEffect, useState } from 'react'
import { useCAIP19Balances } from 'hooks/useBalances/useCAIP19Balances'
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
  const { balances, loading: balancesLoading } = useCAIP19Balances()

  const getPortfolioAssets = useCallback(async () => {
    const assetService = await getAssetService()
    const assets = assetService.byNetwork(NetworkTypes.MAINNET)
    const newPortfolioAssets = Object.keys(balances).reduce<{ [k: CAIP19]: Asset }>(
      (acc, caip19) => {
        const a = assets.find(asset => asset.caip19 === caip19)
        if (!a) return acc
        acc[caip19] = a
        return acc
      },
      {}
    )
    // TODO(0xdef1cafe): remove this hack and stop calling this so often
    if (!isEmpty(newPortfolioAssets) && !isEqual(newPortfolioAssets, portfolioAssets))
      setPortfolioAssets(newPortfolioAssets)

    setPortfolioAssetsLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
