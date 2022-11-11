import type { AssetId } from '@shapeshiftoss/caip'
import { DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { foxEthLpAssetId } from 'state/slices/opportunitiesSlice/constants'

export const getOverrideNameFromAssetId = (assetId: AssetId): string | null => {
  const overrideAssetIdNames: Record<AssetId, string> = {
    [foxEthLpAssetId]: foxEthLpOpportunityName,
  }
  return overrideAssetIdNames[assetId] ?? null
}

export const makeProviderName = (provider: string): string => {
  const overrideProviderNames: Partial<Record<DefiProvider, string>> = {
    [DefiProvider.FoxFarming]: 'ShapeShift',
  }
  return overrideProviderNames[provider as DefiProvider] ?? provider
}
