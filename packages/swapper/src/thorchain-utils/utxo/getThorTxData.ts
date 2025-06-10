import type { Asset } from '@shapeshiftoss/types'

import type { SwapperConfig, SwapperName } from '../../types'
import { getInboundAddressDataForChain } from '../getInboundAddressDataForChain'
import { getDaemonUrl } from '../index'

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
  const daemonUrl = getDaemonUrl(config, swapperName)

  const res = await getInboundAddressDataForChain(daemonUrl, sellAsset.assetId, false, swapperName)
  if (res.isErr()) throw res.unwrapErr()

  const { address: vault } = res.unwrap()

  return { vault }
}
