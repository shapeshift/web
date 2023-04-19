import type { AssetId } from '@shapeshiftoss/caip'
import { adapters } from '@shapeshiftoss/caip'
import type { InboundAddressResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { thorService } from 'lib/swapper/swappers/ThorchainSwapper/utils/thorService'

export const getInboundAddressDataForChain = async (
  daemonUrl: string,
  assetId: AssetId | undefined,
  excludeHalted = true,
): Promise<InboundAddressResponse | undefined> => {
  if (!assetId) return undefined
  const assetPoolId = adapters.assetIdToPoolAssetId({ assetId })
  const assetChainSymbol = assetPoolId?.slice(0, assetPoolId.indexOf('.'))
  const { data: inboundAddresses } = await thorService.get<InboundAddressResponse[]>(
    `${daemonUrl}/lcd/thorchain/inbound_addresses`,
  )
  const activeInboundAddresses = inboundAddresses.filter(a => !a.halted)
  return (excludeHalted ? activeInboundAddresses : inboundAddresses).find(
    inbound => inbound.chain === assetChainSymbol,
  )
}
