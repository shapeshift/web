import type { Asset } from '@shapeshiftoss/types'

import { getInboundAddressDataForChain } from '../../../../thorchain-utils'
import type { SwapperConfig } from '../../../../types'

type GetThorTxInfoArgs = {
  sellAsset: Asset
  xpub: string
  memo: string
  config: SwapperConfig
}
type GetThorTxInfoReturn = Promise<{
  opReturnData: string
  vault: string
  pubkey: string
}>

export const getThorTxInfo = async ({
  sellAsset,
  xpub,
  memo,
  config,
}: GetThorTxInfoArgs): GetThorTxInfoReturn => {
  const daemonUrl = config.REACT_APP_THORCHAIN_NODE_URL
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
