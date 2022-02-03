import { caip2, CAIP19 } from '@shapeshiftoss/caip'
import { useAppSelector } from 'state/store'
import { selectAssetByCAIP19 } from 'state/slices/assetsSlice/assetsSlice'

export const renderForChains = (chains: string[], assetId: CAIP19, callback: Function) => {
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))
  const { chain } = caip2.fromCAIP2(asset.caip2)

  if (!chain) return null

  if (chains.includes(chain)) {
    return callback()
  }

  return null
}
