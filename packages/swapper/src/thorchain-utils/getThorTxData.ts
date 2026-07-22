import type { Asset } from '@shapeshiftoss/types'
import { chainIdToFeeAssetId } from '@shapeshiftoss/utils'
import type { Address } from 'viem'
import { getAddress } from 'viem'

import type { SwapperConfig, SwapperName } from '../types'
import { getInboundAddressDataForChain } from './getInboundAddressDataForChain'
import { getChainIdBySwapper, getDaemonUrl } from './index'

type GetThorTxDataArgs = {
  sellAsset: Asset
  config: SwapperConfig
  swapperName: SwapperName
}

const getInboundAddress = async ({ sellAsset, config, swapperName }: GetThorTxDataArgs) => {
  const daemonUrl = getDaemonUrl(config, swapperName)

  // Inbound addresses are per chain, so look up via the chain's fee asset - the sell asset itself
  // may not be a pool asset (e.g. longtail tokens)
  const assetId = chainIdToFeeAssetId(sellAsset.chainId)

  const res = await getInboundAddressDataForChain(daemonUrl, assetId, true, swapperName)
  if (res.isErr()) throw res.unwrapErr()

  return res.unwrap()
}

export const getThorTxData = async (args: GetThorTxDataArgs): Promise<{ vault: string }> => {
  const { sellAsset, swapperName } = args

  // Native assets on the swapper's own chain (RUNE on THORChain, CACAO on MAYAChain)
  // deposit via MsgDeposit and have no recipient address
  if (sellAsset.chainId === getChainIdBySwapper(swapperName)) return { vault: '' }

  const { address: vault } = await getInboundAddress(args)

  return { vault }
}

export const getThorRouterAndVault = async (
  args: GetThorTxDataArgs,
): Promise<{ router: Address; vault: Address }> => {
  const inboundAddress = await getInboundAddress(args)

  if (!inboundAddress.router) {
    throw Error(
      `No router found for ${args.sellAsset.assetId} at inbound address ${inboundAddress.address}`,
    )
  }

  return { router: getAddress(inboundAddress.router), vault: getAddress(inboundAddress.address) }
}
