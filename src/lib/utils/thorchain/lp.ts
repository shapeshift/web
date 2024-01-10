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

export const getThorchainLiquidityMember = async ({
  accountId,
}: {
  accountId: AccountId
  assetId?: AssetId // not in use yet but we may need it
}): Promise<MidgardLiquidityProvider | null> => {
  // TODO(gomes): handle UTXOs - this is only handling address-based accounts for the sake of simplicity
  const address = fromAccountId(accountId).account

  const { data } = await axios.get<MidgardLiquidityProvider>(
    `${getConfig().REACT_APP_MIDGARD_URL}/member/${address}`,
  )

  return data
}

export const getThorchainLiquidityProviderPosition = async ({
  accountId,
  assetId,
}: {
  accountId: AccountId
  assetId: AssetId
}): Promise<{
  positions: MidgardPool[]
  poolData: ThornodePoolResponse
} | null> => {
  const poolAssetId = assetIdToPoolAssetId({ assetId })

  const midgardLiquidityProvider = await getThorchainLiquidityMember({ accountId })

  if (!midgardLiquidityProvider) return null

  const positions = midgardLiquidityProvider.pools

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

  const { data: poolData } = await axios.get<ThornodePoolResponse>(
    `${getConfig().REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/pool/${poolAssetId}`,
  )
  return {
    positions,
    poolData,
  }
}
