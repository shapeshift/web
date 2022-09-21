import type { AssetId } from '@shapeshiftoss/caip'
import { useEffect, useState } from 'react'
import { logger } from 'lib/logger'

import type { FiatRamp, SupportedFiatRampConfig } from '../config'
import { supportedFiatRamps } from '../config'
import { FiatRampAction } from '../FiatRampsCommon'

const moduleLogger = logger.child({
  namespace: ['Modals', 'FiatRamps', 'hooks', 'useFiatRampCurrencyList'],
})

type useFiatRampByAssetIdProps = {
  assetId: AssetId | undefined
  action: FiatRampAction
}

export const useFiatRampByAssetId = ({ assetId, action }: useFiatRampByAssetIdProps) => {
  const [loading, setLoading] = useState(false)
  const [providers, setProviders] = useState<SupportedFiatRampConfig[]>([])

  useEffect(() => {
    if (!assetId) return
    setLoading(true)
    const tmpProviders: SupportedFiatRampConfig[] = []
    async function getBySellAssets() {
      await Promise.all(
        Object.keys(supportedFiatRamps).map(async provider => {
          try {
            const fiatProvider = supportedFiatRamps[provider as FiatRamp]
            const [parsedBuyList, parsedSellList] = await fiatProvider.getBuyAndSellList()

            parsedBuyList.filter(a => a.assetId === assetId)
            const arrayToCompare = action === FiatRampAction.Buy ? parsedBuyList : parsedSellList
            const hasMatch = arrayToCompare.some(value => {
              return value.assetId === assetId
            })
            if (hasMatch) {
              tmpProviders.push(fiatProvider)
            }
          } catch (e) {
            moduleLogger.warn(e, 'mergeFiatRamps')
          }
        }),
      )
      setProviders(tmpProviders)
      setLoading(false)
    }
    getBySellAssets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId, action])

  return {
    loading,
    providers,
  }
}
