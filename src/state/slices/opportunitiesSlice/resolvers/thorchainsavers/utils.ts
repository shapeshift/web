import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { adapters, fromAccountId } from '@shapeshiftoss/caip'
import type { UtxoBaseAdapter, UtxoChainId } from '@shapeshiftoss/chain-adapters'
import type { ThornodePoolResponse } from '@shapeshiftoss/swapper'
import axios from 'axios'
import { getConfig } from 'config'
import memoize from 'lodash/memoize'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { BigNumber, BN } from 'lib/bignumber/bignumber'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { isUtxoAccountId } from 'state/slices/portfolioSlice/utils'

import type { MidgardPoolResponse, ThorchainSaverPositionResponse } from './types'

const THOR_PRECISION = 8

// Memoized on accountId, see lodash docs:
// "By default, the first argument provided to the memoized function is used as the map cache key."
export const getAccountAddresses = memoize(async (accountId: AccountId): Promise<string[]> => {
  if (isUtxoAccountId(accountId)) {
    const { chainId, account: pubkey } = fromAccountId(accountId)
    const chainAdapters = getChainAdapterManager()
    const adapter = chainAdapters.get(chainId) as unknown as UtxoBaseAdapter<UtxoChainId>
    if (!adapter) throw new Error(`no adapter for ${chainId} not available`)

    const {
      chainSpecific: { addresses },
    } = await adapter.getAccount(pubkey)

    if (!addresses) return []

    return addresses.map(address =>
      address.pubkey.startsWith('bitcoincash')
        ? address.pubkey.replace('bitcoincash:', '')
        : address.pubkey,
    )
  }

  return [fromAccountId(accountId).account]
})

export const getThorchainPools = async (): Promise<ThornodePoolResponse[]> => {
  const { data: opportunitiesData } = await axios.get<ThornodePoolResponse[]>(
    `${getConfig().REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/pools`,
  )

  if (!opportunitiesData) return []

  return opportunitiesData
}

export const getThorchainSaversPositions = async (
  assetId: AssetId,
): Promise<ThorchainSaverPositionResponse[]> => {
  const poolId = adapters.assetIdToPoolAssetId({ assetId })

  if (!poolId) return []

  const { data: opportunitiesData } = await axios.get<ThorchainSaverPositionResponse[]>(
    `${getConfig().REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/pool/${poolId}/savers`,
  )

  if (!opportunitiesData) return []

  return opportunitiesData
}

export const getMidgardPools = async (): Promise<MidgardPoolResponse[]> => {
  const { data: poolsData } = await axios.get<MidgardPoolResponse[]>(
    `${getConfig().REACT_APP_MIDGARD_URL}/pools`,
  )

  if (!poolsData) return []

  return poolsData
}

export const fromThorBaseUnit = (valueThorBaseUnit: BigNumber.Value | null | undefined): BN =>
  bnOrZero(valueThorBaseUnit).div(bn(10).pow(THOR_PRECISION)) // to crypto precision from THOR 8 dp base unit
