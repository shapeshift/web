import type { ChainId } from '@shapeshiftoss/caip'
import { assetIdToPoolAssetId } from '@shapeshiftoss/swapper'

import type { ThorchainMimir } from '../types'
import { getMimir } from './getMimir'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { bn } from '@/lib/bignumber/bignumber'

type IsChainHaltedParams = {
  mimir: ThorchainMimir
  blockHeight: number
  chainId: ChainId
}

export const isChainHalted = ({ mimir, blockHeight, chainId }: IsChainHaltedParams): boolean => {
  const feeAssetId = getChainAdapterManager().get(chainId)?.getFeeAssetId()
  if (!feeAssetId) throw new Error(`No fee asset found for chainId: ${chainId}`)

  const poolAssetId = assetIdToPoolAssetId({ assetId: feeAssetId })
  if (!poolAssetId) throw new Error(`No pool asset found for feeAssetId: ${feeAssetId}`)

  const chainThorNotation = poolAssetId.split('.')[0]

  const HALTCHAINGLOBAL = getMimir(mimir, 'HALTCHAINGLOBAL')

  // Check global halt
  if (HALTCHAINGLOBAL) return true

  const NODEPAUSECHAINGLOBAL = getMimir(mimir, 'NODEPAUSECHAINGLOBAL')

  // Check node global halt
  if (bn(NODEPAUSECHAINGLOBAL).gt(blockHeight)) return true

  // Check chain-specific halt via admin or double-spend check
  const haltChainKey = `HALT${chainThorNotation}CHAIN`
  const HALTCHAIN = getMimir(mimir, haltChainKey)

  if (HALTCHAIN) return true

  // Check chain-specific solvency halt
  const solvencyHaltChainKey = `SOLVENCYHALT${chainThorNotation}CHAIN`
  const SOLVENCYHALTCHAIN = getMimir(mimir, solvencyHaltChainKey)

  if (SOLVENCYHALTCHAIN) return true

  return false
}
