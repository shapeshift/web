import type { Asset } from '@shapeshiftoss/types'
import type { Address } from 'viem'
import { getAddress } from 'viem'

import type { SwapperConfig, SwapperName } from '../../types'
import { getInboundAddressDataForChain } from '../getInboundAddressDataForChain'
import { getDaemonUrl } from '../index'

type GetThorRouterAndVaultArgs = {
  sellAsset: Asset
  config: SwapperConfig
  swapperName: SwapperName
}

type GetThorRouterAndVaultReturn = {
  router: Address
  vault: Address
}

export const getThorRouterAndVault = async ({
  sellAsset,
  config,
  swapperName,
}: GetThorRouterAndVaultArgs): Promise<GetThorRouterAndVaultReturn> => {
  const daemonUrl = getDaemonUrl(config, swapperName)

  const res = await getInboundAddressDataForChain(daemonUrl, sellAsset.assetId, true, swapperName)
  if (res.isErr()) throw res.unwrapErr()

  const inboundAddress = res.unwrap()

  const router = getAddress(inboundAddress.router ?? '')
  const vault = getAddress(inboundAddress.address)

  if (!router) {
    throw Error(`No router found for ${sellAsset.assetId} at inbound address ${inboundAddress}`)
  }

  return { router, vault }
}
