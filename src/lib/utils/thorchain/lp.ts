import { type AccountId, type AssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import axios from 'axios'
import { getConfig } from 'config'
import type { ThornodePoolResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { isUtxoChainId } from 'state/slices/portfolioSlice/utils'

import { getAccountAddresses } from '.'
import type {
  MidgardLiquidityProvider,
  MidgardPool,
  ThorchainLiquidityProvidersResponseSuccess,
  ThorNodeLiquidityProvider,
} from './lp/types'

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
}): Promise<{
  positions: (ThorNodeLiquidityProvider & MidgardPool)[]
  poolData: ThornodePoolResponse
} | null> => {
  const poolAssetId = assetIdToPoolAssetId({ assetId })

  const accountPosition = await (async () => {
    const address = fromAccountId(accountId).account
    if (!isUtxoChainId(fromAssetId(assetId).chainId))
      return (
        await axios.get<ThorNodeLiquidityProvider>(
          `${
            getConfig().REACT_APP_THORCHAIN_NODE_URL
          }/lcd/thorchain/pool/${poolAssetId}/liquidity_provider/${address}`,
        )
      ).data

    const liquidityProviderPositionsResponse =
      await getAllThorchainLiquidityProviderPositions(assetId)

    const allPositions = liquidityProviderPositionsResponse
    if (!allPositions.length) {
      throw new Error(`No LP positions found for asset ID: ${assetId}`)
    }

    const accountAddresses = await getAccountAddresses(accountId)

    return allPositions.find(position => accountAddresses.includes(position?.asset_address ?? ''))
  })()
  if (!accountPosition) return null

  // TODO(gomes): asset_address *or* rune_address when implementing sim. pools
  const { data: midgardLiquidityProvider } = await axios.get<MidgardLiquidityProvider>(
    `${getConfig().REACT_APP_MIDGARD_URL}/member/${accountPosition.asset_address}`,
  )

  const memberData = midgardLiquidityProvider.pools.find(
    pool =>
      pool.pool === accountPosition.asset &&
      pool.assetAddress === accountPosition.asset_address &&
      pool.runeAddress === accountPosition.rune_address,
  )

  if (!memberData) throw new Error('Cannot get Midgard member data for LP position')

  const { data: poolData } = await axios.get<ThornodePoolResponse>(
    `${getConfig().REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/pool/${poolAssetId}`,
  )
  return {
    positions: [
      // TODO(gomes): this should handle multiple positions
      {
        ...accountPosition,
        ...memberData,
      },
    ],
    poolData,
  }
}
