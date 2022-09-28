import type { AssetId } from '@shapeshiftoss/caip'
import { useEffect, useState } from 'react'
import { useGetFiatRampAssetsQuery } from 'state/apis/fiatRamps/fiatRamps'

import type { FiatRamp, SupportedFiatRampConfig } from '../config'
import { supportedFiatRamps } from '../config'
import type { FiatRampAsset } from '../FiatRampsCommon'
import { FiatRampAction } from '../FiatRampsCommon'
import { useFiatRampCurrencyList } from './useFiatRampCurrencyList'

type UseFiatRampByAssetIdProps = {
  assetId?: AssetId
  action: FiatRampAction
}

export const useFiatRampByAssetId = ({ assetId, action }: UseFiatRampByAssetIdProps) => {
  const [providers, setProviders] = useState<SupportedFiatRampConfig[]>([])
  const [selectedAsset, setSelectedAsset] = useState<FiatRampAsset | undefined>()

  const { data: fiatRampData } = useGetFiatRampAssetsQuery()
  const { buyList, sellList } = useFiatRampCurrencyList()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!assetId) return
    if (!fiatRampData) return
    setLoading(true)
    const parsedProviders = Object.entries(fiatRampData).reduce<SupportedFiatRampConfig[]>(
      (acc, [k, p]) => {
        if (assetId && p[action].some(fiatRampAsset => fiatRampAsset.assetId === assetId))
          acc.push(supportedFiatRamps[k as FiatRamp])
        return acc
      },
      [],
    )
    setProviders(parsedProviders)
    setLoading(false)
  }, [assetId, action, fiatRampData])

  useEffect(() => {
    if (assetId) {
      const list = action === FiatRampAction.Buy ? buyList : sellList
      const asset = list.find(asset => asset.assetId === assetId)
      setSelectedAsset(asset)
    }
  }, [action, assetId, buyList, sellList])

  return {
    selectedAsset,
    loading,
    providers,
  }
}
