import type { AssetId } from '@shapeshiftoss/caip'
import { assetIdToPoolAssetId } from '@shapeshiftoss/swapper'

import { useThorchainMimir } from './useThorchainMimir'

export const useIsLpDepositEnabled = (assetId: AssetId | undefined) => {
  return useThorchainMimir({
    enabled: Boolean(assetId),
    select: mimir => {
      if (!assetId) return undefined

      const pauseLpDepositMimirs = Object.fromEntries(
        Object.entries(mimir).filter(([k]) => k.startsWith('PAUSELPDEPOSIT-')),
      )
      const thorchainAssetId = assetIdToPoolAssetId({ assetId })

      const isDisabled = Object.entries(pauseLpDepositMimirs).some(([k, v]) => {
        // PAUSELPDEPOSIT- mimirs don't use the usual dot notation
        // e.g ETH.FLIP-0X826180541412D574CF1336D22C0C0A287822678A becomes PAUSELPDEPOSIT-ETH-FLIP-0X826180541412D574CF1336D22C0C0A287822678A
        const poolAssetId = (k.split('PAUSELPDEPOSIT-')[1] ?? '').replace('-', '.')

        return poolAssetId === thorchainAssetId && Boolean(v)
      })

      // If it's not explicitly disabled, it's enabled :shrugs:
      return !isDisabled
    },
  })
}
