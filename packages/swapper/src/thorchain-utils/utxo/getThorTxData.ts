import type { Asset } from '@shapeshiftoss/types'

import type { SwapperConfig } from '../../types'
import { getInboundAddressDataForChain } from '../getInboundAddressDataForChain'

type GetThorTxDataArgs = {
  sellAsset: Asset
  xpub: string
  memo: string
  config: SwapperConfig
}

type GetThorTxDataReturn = Promise<{
  opReturnData: string
  vault: string
  pubkey: string
}>

export const getThorTxData = async ({
  sellAsset,
  xpub,
  memo,
  config,
}: GetThorTxDataArgs): GetThorTxDataReturn => {
  const daemonUrl = config.VITE_THORCHAIN_NODE_URL
  const maybeInboundAddress = await getInboundAddressDataForChain(
    daemonUrl,
    sellAsset.assetId,
    false,
  )

  if (maybeInboundAddress.isErr()) throw maybeInboundAddress.unwrapErr()
  const inboundAddress = maybeInboundAddress.unwrap()
  const vault = inboundAddress.address

  return {
    opReturnData: memo,
    vault,
    pubkey: xpub,
  }
}
