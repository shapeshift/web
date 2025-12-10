import type { AssetId } from '@shapeshiftoss/caip'
import { thorchainChainId } from '@shapeshiftoss/caip'
import { assetIdToThorPoolAssetId } from '@shapeshiftoss/swapper'

import type { ThorchainMimir } from '../types'
import { useThorchainMimir } from './useThorchainMimir'

// Check if LP is disabled at the chain level (global or chain-specific PAUSELP)
export const isLpChainHalted = ({
  mimir,
  assetId,
}: {
  mimir: ThorchainMimir
  assetId: AssetId | undefined
}) => {
  if (!assetId) return undefined

  // Check global PAUSELP
  if (mimir.PAUSELP) return true

  const thorchainAssetId = assetIdToThorPoolAssetId({ assetId })
  const chainThorNotation = thorchainAssetId?.split('.')[0] // Extract chain: 'ETH', 'AVAX', 'BTC', etc

  // Check chain-specific PAUSELP (e.g., PAUSELPETH, PAUSELPAVAX)
  if (chainThorNotation) {
    const pauseLpChainKey = `PAUSELP${chainThorNotation}` as keyof ThorchainMimir
    if (mimir[pauseLpChainKey]) return true
  }

  return false
}

export const isLpDepositEnabled = ({
  mimir,
  assetId,
}: {
  mimir: ThorchainMimir
  assetId: AssetId | undefined
}) => {
  if (!assetId) return undefined

  if (mimir.PAUSELP) return false

  const thorchainAssetId = assetIdToThorPoolAssetId({ assetId })
  const chainThorNotation = thorchainAssetId?.split('.')[0] // Extract chain: 'ETH', 'AVAX', 'BTC', etc

  // Check chain-specific PAUSELP (e.g., PAUSELPETH, PAUSELPAVAX)
  if (chainThorNotation) {
    const pauseLpChainKey = `PAUSELP${chainThorNotation}` as keyof ThorchainMimir
    if (mimir[pauseLpChainKey]) return false
  }

  const pauseLpDepositMimirs = Object.fromEntries(
    Object.entries(mimir).filter(([k]) => k.startsWith('PAUSELPDEPOSIT-')),
  )

  const isDisabled = Object.entries(pauseLpDepositMimirs).some(([k, v]) => {
    // PAUSELPDEPOSIT- mimirs don't use the usual dot notation
    // e.g ETH.FLIP-0X826180541412D574CF1336D22C0C0A287822678A becomes PAUSELPDEPOSIT-ETH-FLIP-0X826180541412D574CF1336D22C0C0A287822678A
    const poolAssetId = (k.split('PAUSELPDEPOSIT-')[1] ?? '').replace('-', '.')

    return poolAssetId === thorchainAssetId && Boolean(v)
  })

  // If it's not explicitly disabled, it's enabled :shrugs:
  return !isDisabled
}

export const isLpWithdrawEnabled = ({
  mimir,
  assetId,
}: {
  mimir: ThorchainMimir
  assetId: AssetId | undefined
}) => {
  if (!assetId) return undefined

  if (mimir.PAUSELP) return false

  const thorchainAssetId = assetIdToThorPoolAssetId({ assetId })
  const chainThorNotation = thorchainAssetId?.split('.')[0] // Extract chain: 'ETH', 'AVAX', 'BTC', etc

  // Check chain-specific PAUSELP (e.g., PAUSELPETH, PAUSELPAVAX)
  if (chainThorNotation) {
    const pauseLpChainKey = `PAUSELP${chainThorNotation}` as keyof ThorchainMimir
    if (mimir[pauseLpChainKey]) return false
  }

  return true
}

export const useIsLpChainHalted = (assetId: AssetId | undefined) => {
  return useThorchainMimir({
    chainId: thorchainChainId,
    enabled: Boolean(assetId),
    select: mimir => isLpChainHalted({ mimir, assetId }),
  })
}

export const useIsLpDepositEnabled = (assetId: AssetId | undefined) => {
  return useThorchainMimir({
    chainId: thorchainChainId,
    enabled: Boolean(assetId),
    select: mimir => isLpDepositEnabled({ mimir, assetId }),
  })
}

export const useIsLpWithdrawEnabled = (assetId: AssetId | undefined) => {
  return useThorchainMimir({
    chainId: thorchainChainId,
    enabled: Boolean(assetId),
    select: mimir => isLpWithdrawEnabled({ mimir, assetId }),
  })
}
