import { AssetService } from '@shapeshiftoss/asset-service'
import React, { createContext, useContext, useEffect, useState } from 'react'

type AssetProviderProps = {
  children: React.ReactNode
}

const AssetContext = createContext<AssetService | null>(null)

export const AssetProvider = ({ children }: AssetProviderProps): JSX.Element => {
  const [assetService, setAssetService] = useState<AssetService | null>(null)

  useEffect(() => {
    ;(async () => {
      const service = new AssetService('')
      await service.initialize()
      setAssetService(service)
    })()
  }, [])

  return <AssetContext.Provider value={assetService}>{children}</AssetContext.Provider>
}

export const useAssets = () => {
  const context = useContext(AssetContext)
  if (!context) throw new Error('Assets cannot be used outside of its context')
  return context
}
