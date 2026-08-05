import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import {
  avalancheAssetId,
  bchAssetId,
  bscAssetId,
  btcAssetId,
  cosmosAssetId,
  dogeAssetId,
  ethAssetId,
  fromAccountId,
  fromAssetId,
  ltcAssetId,
} from '@shapeshiftoss/caip'
import { assetIdToThorPoolAssetId } from '@shapeshiftoss/swapper'
import axios from 'axios'

import { getAccountAddresses } from '.'

import { getConfig } from '@/config'
import { queryClient } from '@/context/QueryClientProvider/queryClient'
import { isUtxoChainId } from '@/lib/utils/utxo'

// Savers vaults are sunset on THORChain, but former savers can still have TCY claims for their
// positions - these helpers remain solely to introspect those positions for the TCY claim flow.

const usdcEthereumAssetId: AssetId = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const usdcAvalancheAssetId: AssetId =
  'eip155:43114/erc20:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e'
const usdtEthereumAssetId: AssetId = 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7'

const SUPPORTED_THORCHAIN_SAVERS_ASSET_IDS = [
  cosmosAssetId,
  avalancheAssetId,
  ethAssetId,
  bscAssetId,
  btcAssetId,
  bchAssetId,
  ltcAssetId,
  dogeAssetId,
  usdcEthereumAssetId,
  usdtEthereumAssetId,
  usdcAvalancheAssetId,
]

export const isSupportedThorchainSaversAssetId = (assetId: AssetId) =>
  SUPPORTED_THORCHAIN_SAVERS_ASSET_IDS.includes(assetId)

export type ThorchainSaverPositionResponse = {
  asset: string
  asset_address: string
  last_add_height: number | undefined
  units: string
  asset_deposit_value: string
  asset_redeem_value: string
  growth_pct: string | undefined
}

const getAllThorchainSaversPositions = async (
  assetId: AssetId,
): Promise<ThorchainSaverPositionResponse[]> => {
  const poolId = assetIdToThorPoolAssetId({ assetId })

  if (!poolId) return []

  const { data: opportunitiesData } = await queryClient.fetchQuery({
    queryKey: ['thorchainSaversPositions', poolId],
    queryFn: () =>
      axios.get<ThorchainSaverPositionResponse[]>(
        `${getConfig().VITE_THORCHAIN_NODE_URL}/thorchain/pool/${poolId}/savers`,
      ),
    staleTime: 60_000,
  })

  if (!opportunitiesData) return []

  return opportunitiesData
}

export const getThorchainSaversPosition = async ({
  accountId,
  assetId,
}: {
  accountId: AccountId
  assetId: AssetId
}): Promise<ThorchainSaverPositionResponse | null> => {
  const address = fromAccountId(accountId).account
  const poolAssetId = assetIdToThorPoolAssetId({ assetId })

  if (!poolAssetId) return null

  if (!isUtxoChainId(fromAssetId(assetId).chainId))
    return (
      await axios.get<ThorchainSaverPositionResponse>(
        `${getConfig().VITE_THORCHAIN_NODE_URL}/thorchain/pool/${poolAssetId}/saver/${address}`,
      )
    ).data

  const allPositions = await getAllThorchainSaversPositions(assetId)

  if (!allPositions.length)
    throw new Error(`Error fetching THORChain savers positions for assetId: ${assetId}`)

  // Returns either
  // - A tuple made of a single address for EVM and Cosmos chains since the address *is* the account
  // - An array of many addresses for UTXOs, since an xpub can derive many many addresses
  const accountAddresses = await getAccountAddresses(accountId)

  const accountPosition = allPositions.find(
    ({ asset_address }) =>
      asset_address === accountAddresses.find(accountAddress => accountAddress === asset_address),
  )

  return accountPosition ?? null
}
