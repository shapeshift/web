import { avalancheChainId, ethChainId, fromAssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { useFormContext } from 'react-hook-form'
import { useHistory } from 'react-router-dom'
import { useWallet } from 'hooks/useWallet/useWallet'

import {
  AXELAR_CHAIN_NAMES,
  BridgeAsset,
  BridgeChain,
  BridgeRoutePaths,
  BridgeState,
} from '../types'

export const useBridgeRoutes = (): {
  handleAssetClick: (asset: BridgeAsset) => Promise<void>
  handleFromChainClick: (asset: BridgeChain) => Promise<void>
  handleToChainClick: (asset: BridgeChain) => Promise<void>
} => {
  const history = useHistory()
  const { setValue } = useFormContext<BridgeState>()
  const {
    state: { walletInfo },
  } = useWallet()

  const getAxelarChainNameFromBridgeAsset = (asset: BridgeAsset) => {
    const chainId = fromAssetId(asset.assetId).chainId
    switch (chainId) {
      case ethChainId:
        return AXELAR_CHAIN_NAMES.Ethereum
      case avalancheChainId:
        return AXELAR_CHAIN_NAMES.Avalanche
      default:
        throw new Error(`chainId ${chainId} is not supported`)
    }
  }

  const handleAssetClick = useCallback(
    async (asset: BridgeAsset) => {
      const fromChainLabel = getAxelarChainNameFromBridgeAsset(asset)
      const fromChain = asset.implementations?.[fromChainLabel.toLowerCase()]
      try {
        const { implementations } = asset
        const chains = Object.keys(implementations ?? {})
        setValue('asset', asset, { shouldValidate: true })
        setValue('address', walletInfo?.meta?.address)
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
        console.warn(e)
      }
    },
    [setValue, walletInfo?.meta?.address, history],
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
