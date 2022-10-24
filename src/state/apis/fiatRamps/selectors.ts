import type { AssetId } from '@shapeshiftoss/caip'
import { useAppSelector } from 'state/store'

import { fiatRampApi } from './fiatRamps'

export const useIsSupportedFiatBuyAssetId = (assetId: AssetId): boolean =>
  Boolean(
    (useAppSelector(fiatRampApi.endpoints.getFiatRamps.select()).data?.buyAssetIds ?? []).includes(
      assetId,
    ),
  )

export const useIsSupportedFiatSellAssetId = (assetId: AssetId): boolean =>
  Boolean(
    (useAppSelector(fiatRampApi.endpoints.getFiatRamps.select()).data?.sellAssetIds ?? []).includes(
      assetId,
    ),
  )

export const useFiatBuyAssetIds = (): AssetId[] =>
  useAppSelector(fiatRampApi.endpoints.getFiatRamps.select()).data?.buyAssetIds ?? []

export const useFiatSellAssetIds = (): AssetId[] =>
  useAppSelector(fiatRampApi.endpoints.getFiatRamps.select()).data?.sellAssetIds ?? []
