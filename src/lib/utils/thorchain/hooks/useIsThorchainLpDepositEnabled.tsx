import type { AssetId } from '@shapeshiftoss/caip'
import { thorchainChainId } from '@shapeshiftoss/caip'
import { assetIdToThorPoolAssetId } from '@shapeshiftoss/swapper'

import type { ThorchainMimir } from '../types'
import { useThorchainMimir } from './useThorchainMimir'

export const isLpDepositEnabled = ({
  mimir,
  assetId,
}: {
  mimir: ThorchainMimir
  assetId: AssetId | undefined
}) => {
  if (!assetId) return undefined

  const pauseLpDepositMimirs = Object.fromEntries(
    Object.entries(mimir).filter(([k]) => k.startsWith('PAUSELPDEPOSIT-')),
  )
  const thorchainAssetId = assetIdToThorPoolAssetId({ assetId })

  const isDisabled = Object.entries(pauseLpDepositMimirs).some(([k, v]) => {
    // PAUSELPDEPOSIT- mimirs don't use the usual dot notation
    // e.g ETH.FLIP-0X826180541412D574CF1336D22C0C0A287822678A becomes PAUSELPDEPOSIT-ETH-FLIP-0X826180541412D574CF1336D22C0C0A287822678A
    const poolAssetId = (k.split('PAUSELPDEPOSIT-')[1] ?? '').replace('-', '.')

    return poolAssetId === thorchainAssetId && Boolean(v)
  })

  // If it's not explicitly disabled, it's enabled :shrugs:
  return !isDisabled
}

export const useIsLpDepositEnabled = (assetId: AssetId | undefined) => {
  return useThorchainMimir({
    chainId: thorchainChainId,
    enabled: Boolean(assetId),
    select: mimir => isLpDepositEnabled({ mimir, assetId }),
  })
}
