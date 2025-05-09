import type { Asset } from '@shapeshiftoss/types'

import type { SwapperConfig } from '../../types'
import { SwapperName } from '../../types'
import { getInboundAddressDataForChain } from '../getInboundAddressDataForChain'

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
  const url = (() => {
    switch (swapperName) {
      case SwapperName.Thorchain:
        return `${config.VITE_THORCHAIN_NODE_URL}/thorchain`
      case SwapperName.Mayachain:
        return `${config.VITE_MAYACHAIN_NODE_URL}/mayachain`
      default:
        throw new Error(`Invalid swapper name: ${swapperName}`)
    }
  })()

  const res = await getInboundAddressDataForChain(url, sellAsset.assetId, false, swapperName)
  if (res.isErr()) throw res.unwrapErr()

  const { address: vault } = res.unwrap()

  return {
    opReturnData: memo,
    vault,
    pubkey: xpub,
  }
}
