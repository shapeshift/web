import type { AssetId } from '@shapeshiftoss/caip'
import { useEffect, useState } from 'react'
import { logger } from 'lib/logger'

import type { SupportedFiatRampConfig } from '../config'
import { supportedFiatRamps } from '../config'
import type { FiatRampAsset } from '../FiatRampsCommon'
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
    async function getBuySellAssets() {
      const parsedProviders = (
        await Promise.allSettled(
          Object.values(supportedFiatRamps).map<
            Promise<
              [
                provider: SupportedFiatRampConfig,
                buyAndSellList: [FiatRampAsset[], FiatRampAsset[]],
              ]
            >
          >(async provider => {
            return [provider, await provider.getBuyAndSellList()]
          }),
        )
      ).reduce<SupportedFiatRampConfig[]>((acc, getBySellAssetsPromise) => {
        if (getBySellAssetsPromise.status === 'rejected') {
          moduleLogger.error(
            getBySellAssetsPromise?.reason,
            { fn: 'getBySellAssets' },
            'An error happened sorting the fiat ramp buy assets',
          )
          return acc
        }
        const { value } = getBySellAssetsPromise
        const [provider, [currentBuyList, currentSellList]] = value
        const arrayToCompare = action === FiatRampAction.Buy ? currentBuyList : currentSellList
        const hasMatch = arrayToCompare.some(value => {
          return value.assetId === assetId
        })
        if (hasMatch) {
          acc.push(provider)
        }
        return acc
      }, [])
      setProviders(parsedProviders)
      setLoading(false)
    }
    getBuySellAssets()
  }, [assetId, action])

  return {
    loading,
    providers,
  }
}
