import type { Asset } from '@shapeshiftoss/types'

import type { SwapperConfig, SwapperName } from '../../types'
import { getInboundAddressDataForChain } from '../getInboundAddressDataForChain'
import { getDaemonUrl } from '../index'

type GetThorTxDataArgs = {
  sellAsset: Asset
  xpub: string
  memo: string
  config: SwapperConfig
  swapperName: SwapperName
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
  swapperName,
}: GetThorTxDataArgs): GetThorTxDataReturn => {
  const daemonUrl = getDaemonUrl(config, swapperName)

  const res = await getInboundAddressDataForChain(daemonUrl, sellAsset.assetId, false, swapperName)
  if (res.isErr()) throw res.unwrapErr()

  const { address: vault } = res.unwrap()

  return {
    opReturnData: memo,
    vault,
    pubkey: xpub,
  }
}
