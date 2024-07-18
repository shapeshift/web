import type { ChainId } from '@shapeshiftoss/caip'
import { ethAssetId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { useMemo } from 'react'
import { selectAssetById, selectFeeAssetByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const useLedgerAppDetails = (chainId: ChainId) => {
  const asset = useAppSelector(state => selectFeeAssetByChainId(state, chainId))
  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const appName = useMemo(() => {
    if (isEvmChainId(chainId)) return ethAsset?.networkName
    return asset?.networkName
  }, [asset?.networkName, chainId, ethAsset?.networkName])
  const appAsset = useMemo(() => {
    if (isEvmChainId(chainId)) return ethAsset
    return asset
  }, [asset, chainId, ethAsset])

  return { appName, appAsset }
}
