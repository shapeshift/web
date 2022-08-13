import { AssetId } from '@shapeshiftoss/caip'
import { DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import {
  foxEthLpAssetId,
  foxEthLpOpportunityName,
} from 'features/defi/providers/fox-eth-lp/constants'

export const getOverrideNameFromAssetId = (assetId: AssetId): string | null => {
  const overrideAssetIdNames: Record<AssetId, string> = {
    [foxEthLpAssetId]: foxEthLpOpportunityName,
  }
  return overrideAssetIdNames[assetId] ?? null
}

export const getOverrideProviderName = (provider: string): string => {
  const overrideAssetIdNames: Partial<Record<DefiProvider, string>> = {
    [DefiProvider.FoxFarming]: 'ShapeShift',
  }
  return overrideAssetIdNames[provider as DefiProvider] ?? provider
}
