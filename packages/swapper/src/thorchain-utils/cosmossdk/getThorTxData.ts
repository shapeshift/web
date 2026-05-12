import type { Asset } from '@shapeshiftoss/types'

import type { SwapperConfig, SwapperName } from '../../types'
import { getInboundAddressDataForChain } from '../getInboundAddressDataForChain'
import { getChainIdBySwapper, getDaemonUrl } from '../index'

type GetThorTxDataArgs = {
  sellAsset: Asset
  config: SwapperConfig
  swapperName: SwapperName
}

type GetThorTxDataReturn = {
  vault: string
}

export const getThorTxData = async ({
  sellAsset,
  config,
  swapperName,
}: GetThorTxDataArgs): Promise<GetThorTxDataReturn> => {
  // Native assets on the swapper's own chain (RUNE on THORChain, CACAO on MAYAChain)
  // deposit via MsgDeposit and have no recipient address.
  if (sellAsset.chainId === getChainIdBySwapper(swapperName)) return { vault: '' }

  // Everything else (e.g. ATOM via THORChain, RUNE via MAYAChain) sends via MsgSend
  // to the swapper's inbound vault on that chain.
  const daemonUrl = getDaemonUrl(config, swapperName)
  const res = await getInboundAddressDataForChain(daemonUrl, sellAsset.assetId, true, swapperName)
  if (res.isErr()) throw res.unwrapErr()

  return { vault: res.unwrap().address }
}
