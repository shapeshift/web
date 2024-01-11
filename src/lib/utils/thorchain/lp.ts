import { type AccountId, type AssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import axios from 'axios'
import { getConfig } from 'config'
import type { ThornodePoolResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { isUtxoChainId } from 'state/slices/portfolioSlice/utils'

import { getAccountAddresses } from '.'
import type {
  MidgardLiquidityProvider,
  MidgardLiquidityProvidersList,
  MidgardPool,
  ThorchainLiquidityProvidersResponseSuccess,
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

export const getAllThorchainLiquidityMembers = async (): Promise<MidgardLiquidityProvidersList> => {
  const { data } = await axios.get<MidgardLiquidityProvidersList>(
    `${getConfig().REACT_APP_MIDGARD_URL}/members`,
  )

  if (!data?.length || 'error' in data) return []

  return data
}

export const getThorchainLiquidityMember = async (
  address: string,
): Promise<MidgardLiquidityProvider | null> => {
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

  const accountPosition = await (async () => {
    if (!isUtxoChainId(fromAssetId(assetId).chainId)) {
      const address = fromAccountId(accountId).account
      return getThorchainLiquidityMember(address)
    }

    const allMembers = await getAllThorchainLiquidityMembers()

    if (!allMembers.length) {
      throw new Error(`No THORChain members found`)
    }

    const accountAddresses = await getAccountAddresses(accountId)

    const foundMember = allMembers.find(member => accountAddresses.includes(member))
    if (!foundMember) return null

    return getThorchainLiquidityMember(foundMember)
  })()
  if (!accountPosition) return null

  const positions = accountPosition.pools

  const { data: poolData } = await axios.get<ThornodePoolResponse>(
    `${getConfig().REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/pool/${poolAssetId}`,
  )
  return {
    positions,
    poolData,
  }
}
