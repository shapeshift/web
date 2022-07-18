import { useCallback } from 'react'
import { useFormContext } from 'react-hook-form'
import { useHistory } from 'react-router-dom'

import { BridgeAsset, BridgeChain, BridgeRoutePaths, BridgeState } from '../types'

export const useBridgeRoutes = (): {
  handleAssetClick: (asset: BridgeAsset) => Promise<void>
  handleFromChainClick: (asset: BridgeChain) => Promise<void>
  handleToChainClick: (asset: BridgeChain) => Promise<void>
} => {
  const history = useHistory()
  const { setValue } = useFormContext<BridgeState>()

  const handleAssetClick = useCallback(
    async (asset: BridgeAsset) => {
      try {
        console.info(asset)
        const { implmentations } = asset
        const chains = Object.keys(implmentations ?? {})
        setValue('asset', asset)
        setValue('fromChain', undefined)
        setValue('toChain', undefined)
        if (chains.length > 1) {
          history.push(BridgeRoutePaths.ChainFromSelect)
        } else {
          history.push(BridgeRoutePaths.Input)
        }
      } catch (e) {
        console.warn(e)
      }
    },
    [setValue, history],
  )

  const handleFromChainClick = useCallback(
    async (chain: BridgeChain) => {
      try {
        setValue('fromChain', chain, { shouldValidate: true })
      } catch (e) {
        console.warn(e)
      } finally {
        history.push(BridgeRoutePaths.Input)
      }
    },
    [setValue, history],
  )

  const handleToChainClick = useCallback(
    async (chain: BridgeChain) => {
      try {
        setValue('toChain', chain, { shouldValidate: true })
      } catch (e) {
        console.warn(e)
      } finally {
        history.push(BridgeRoutePaths.Input)
      }
    },
    [setValue, history],
  )

  return { handleAssetClick, handleFromChainClick, handleToChainClick }
}
