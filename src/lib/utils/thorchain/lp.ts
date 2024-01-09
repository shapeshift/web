import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import axios from 'axios'
import { getConfig } from 'config'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'

import { getAccountAddresses } from '.'
import type { LiquidityProvider, ThorchainLiquidityProvidersResponseSuccess } from './lp/types'

export const getAllThorchainLiquidityProviderPositions = async (
  assetId: AssetId,
): Promise<ThorchainLiquidityProvidersResponseSuccess> => {
  const poolAssetId = assetIdToPoolAssetId({ assetId })

  if (!poolAssetId) throw new Error(`Pool asset not found for assetId ${assetId}`)

  const { data } = await axios.get<ThorchainLiquidityProvidersResponseSuccess>(
    `${
      getConfig().REACT_APP_THORCHAIN_NODE_URL
    }/lcd/thorchain/pool/${poolAssetId}/liquidity_providers`,
  )

  if (!data || 'error' in data) return []

  return data
}

export const getThorchainLiquidityProviderPosition = async ({
  accountId,
  assetId,
}: {
  accountId: AccountId
  assetId: AssetId
}): Promise<LiquidityProvider | null> => {
  // TODO(gomes): we want to use the /liquidity_provider/<address> endpoint for any chain other than UTXOs
  // this is a big response, and can take a long time to be fetched
  const liquidityProviderPositionsResponse =
    await getAllThorchainLiquidityProviderPositions(assetId)

  const allPositions = liquidityProviderPositionsResponse
  if (!allPositions.length) {
    throw new Error(`No LP positions found for asset ID: ${assetId}`)
  }

  const accountAddresses = await getAccountAddresses(accountId)

  const accountPosition = allPositions.find(position =>
    accountAddresses.includes(position.asset_address),
  )

  return accountPosition || null
}
