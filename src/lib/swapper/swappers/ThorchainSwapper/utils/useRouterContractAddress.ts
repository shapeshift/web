import { type AssetId, fromAssetId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { useQuery } from '@tanstack/react-query'
import { getConfig } from 'config'
import { getInboundAddressDataForChain } from 'lib/utils/thorchain/getInboundAddressDataForChain'

// Fetches the THOR router contract address for a given feeAssetId
// This is used to determine the correct router contract address for THOR contract approvals, swaps, and savers deposits/withdraws.

export const fetchRouterContractAddress = async (assetId: AssetId, excludeHalted: boolean) => {
  const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
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
  assetId,
  excludeHalted,
}: {
  skip?: boolean
  assetId: AssetId | undefined
  excludeHalted?: boolean
}) => {
  const chainId = assetId ? fromAssetId(assetId).chainId : undefined
  const isEvmChain = chainId && isEvmChainId(chainId)

  const { data: routerContractAddress, isLoading } = useQuery({
    queryKey: ['routerContractAddress', assetId, excludeHalted],
    queryFn: () => fetchRouterContractAddress(assetId!, Boolean(excludeHalted)),
    enabled: !skip && isEvmChain,
    staleTime: 120_000, // 2mn arbitrary staleTime to avoid refetching for the same args (assetId, excludeHalted)
  })

  return { routerContractAddress, isLoading }
}
