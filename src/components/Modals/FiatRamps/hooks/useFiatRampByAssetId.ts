import type { AssetId } from '@keepkey/caip'
import { useEffect, useState } from 'react'
import { useGetFiatRampAssetsQuery } from 'state/apis/fiatRamps/fiatRamps'

import type { FiatRamp, SupportedFiatRampConfig } from '../config'
import { supportedFiatRamps } from '../config'
import type { FiatRampAction } from '../FiatRampsCommon'

type UseFiatRampByAssetIdProps = {
  assetId?: AssetId
  action: FiatRampAction
}

export const useFiatRampByAssetId = ({ assetId, action }: UseFiatRampByAssetIdProps) => {
  const [providers, setProviders] = useState<SupportedFiatRampConfig[]>([])

  const { data: fiatRampData } = useGetFiatRampAssetsQuery()
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

  return {
    loading,
    providers,
  }
}
