import { type AssetId, fromAssetId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import { useQuery } from '@tanstack/react-query'

import { getInboundAddressDataForChain } from '../../../thorchain-utils'
import type { SwapperConfig } from '../../../types'

// Fetches the THOR router contract address for a given feeAssetId
// This is used to determine the correct router contract address for THOR contract approvals, swaps, and savers deposits/withdraws.

export const fetchRouterContractAddress = async (
  assetId: AssetId,
  excludeHalted: boolean,
  config: SwapperConfig,
) => {
  const daemonUrl = config.REACT_APP_THORCHAIN_NODE_URL
  const maybeInboundAddressData = await getInboundAddressDataForChain(
    daemonUrl,
    assetId,
    excludeHalted,
  )

  if (maybeInboundAddressData.isErr()) {
    throw new Error(maybeInboundAddressData.unwrapErr().message)
  }

  const inboundAddressData = maybeInboundAddressData.unwrap()

  if (!inboundAddressData.router) {
    throw new Error(`No router address found for feeAsset ${assetId}`)
  }

  return inboundAddressData.router
}

export const useRouterContractAddress = ({
  skip = false,
  feeAssetId: assetId,
  excludeHalted,
  config,
}: {
  skip?: boolean
  feeAssetId: AssetId
  excludeHalted?: boolean
  config: SwapperConfig
}) => {
  const { chainId } = fromAssetId(assetId)
  const isEvmChain = evm.isEvmChainId(chainId)

  const { data: routerContractAddress, isLoading } = useQuery({
    queryKey: ['routerContractAddress', assetId, excludeHalted],
    queryFn: () => fetchRouterContractAddress(assetId, Boolean(excludeHalted), config),
    enabled: !skip && isEvmChain,
    staleTime: 120_000, // 2mn arbitrary staleTime to avoid refetching for the same args (assetId, excludeHalted)
  })

  return { routerContractAddress, isLoading }
}
