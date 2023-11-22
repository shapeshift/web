import { type AssetId, fromAssetId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { getConfig } from 'config'
import { useCallback, useEffect, useState } from 'react'
import { getInboundAddressDataForChain } from 'lib/utils/thorchain/getInboundAddressDataForChain'

// Fetches the THOR router contract address for a given feeAssetId
// This is used to determine the correct router contract address for THOR contract approvals, swaps, and savers deposits/withdraws.

export const useRouterContractAddress = ({
  skip = false,
  feeAssetId: assetId,
}: {
  skip?: boolean
  // A native EVM AssetId i.e ethAssetId and avalancheAssetId, the two supported EVM chains at the time of writing
  feeAssetId: AssetId
}) => {
  const [routerContractAddress, setRouterContractAddress] = useState<string | null>(null)

  const fetchRouterContractAddress = useCallback(async () => {
    try {
      const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
      const maybeInboundAddressData = await getInboundAddressDataForChain(daemonUrl, assetId)

      if (maybeInboundAddressData.isErr()) {
        throw new Error(maybeInboundAddressData.unwrapErr().message)
      }

      const inboundAddressData = maybeInboundAddressData.unwrap()

      // This should never happen as we're passing EVM native AssetIds here, but it may
      if (!inboundAddressData.router) {
        throw new Error(`No router address found for feeAsset ${assetId}`)
      }

      setRouterContractAddress(inboundAddressData.router)
    } catch (error) {
      console.error(error)
      setRouterContractAddress(null)
    }
  }, [assetId])

  useEffect(() => {
    if (skip) return

    const { chainId } = fromAssetId(assetId)
    if (!isEvmChainId(chainId)) return

    fetchRouterContractAddress()
  }, [skip, fetchRouterContractAddress, assetId])

  return routerContractAddress
}
