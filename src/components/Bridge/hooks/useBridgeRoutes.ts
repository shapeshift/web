import { avalancheChainId, ethChainId, fromAssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { useFormContext } from 'react-hook-form'
import { useHistory } from 'react-router-dom'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'

import type { BridgeAsset, BridgeChain, BridgeState } from '../types'
import { AxelarChainNames, BridgeRoutePaths } from '../types'

export const useBridgeRoutes = (): {
  handleAssetClick: (asset: BridgeAsset) => void
  handleFromChainClick: (asset: BridgeChain) => void
  handleToChainClick: (asset: BridgeChain) => void
} => {
  const history = useHistory()
  const { setValue } = useFormContext<BridgeState>()
  const {
    state: { wallet },
  } = useWallet()

  const chainAdapterManager = getChainAdapterManager()

  const getAxelarChainNameFromBridgeAsset = (asset: BridgeAsset) => {
    const chainId = fromAssetId(asset.assetId).chainId
    switch (chainId) {
      case ethChainId:
        return AxelarChainNames.Ethereum
      case avalancheChainId:
        return AxelarChainNames.Avalanche
      default:
        throw new Error(`chainId ${chainId} is not supported`)
    }
  }

  const handleAssetClick = useCallback(
    async (asset: BridgeAsset) => {
      const chainId = fromAssetId(asset.assetId).chainId
      const chainAdapter = chainAdapterManager.get(chainId)
      if (!(wallet && chainAdapter)) return
      const accountAddress = await chainAdapter.getAddress({
        wallet,
        accountNumber: 0, // TODO(0xdef1cafe): multi account support
      })

      const fromChainLabel = getAxelarChainNameFromBridgeAsset(asset)
      const fromChain = asset.implementations?.[fromChainLabel.toLowerCase()]
      try {
        const { implementations } = asset
        const chains = Object.keys(implementations ?? {})
        setValue('asset', asset, { shouldValidate: true })
        setValue('receiveAddress', accountAddress)
        setValue('fromChain', fromChain, { shouldValidate: true })
        if (chains.length === 2) {
          // There is only one option left for the toChain, select it automatically
          const toChainLabel = chains.filter(chain => chain !== fromChainLabel.toLowerCase())[0]
          const toChain = asset.implementations?.[toChainLabel.toLowerCase()]
          setValue('toChain', toChain, { shouldValidate: true })
        } else {
          // Let the user pick
          setValue('toChain', undefined, { shouldValidate: true })
        }
        history.push(BridgeRoutePaths.Input)
      } catch (e) {
        console.error(e)
      }
    },
    [chainAdapterManager, wallet, setValue, history],
  )

  const handleFromChainClick = useCallback(
    (chain: BridgeChain) => {
      try {
        setValue('fromChain', chain, { shouldValidate: true })
      } catch (e) {
        console.error(e)
      } finally {
        history.push(BridgeRoutePaths.Input)
      }
    },
    [setValue, history],
  )

  const handleToChainClick = useCallback(
    (chain: BridgeChain) => {
      try {
        setValue('toChain', chain, { shouldValidate: true })
      } catch (e) {
        console.error(e)
      } finally {
        history.push(BridgeRoutePaths.Input)
      }
    },
    [setValue, history],
  )

  return { handleAssetClick, handleFromChainClick, handleToChainClick }
}
