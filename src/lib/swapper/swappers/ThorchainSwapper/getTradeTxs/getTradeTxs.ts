import { getConfig } from 'config'
import type { MidgardActionsResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'

import { thorService } from '../utils/thorService'

export const getTradeTxs = async (
  txHash: string,
): Promise<{ sellTxId: string; buyTxId?: string }> => {
  const midgardTxid = txHash.startsWith('0x') ? txHash.slice(2) : txHash

  const midgardUrl = getConfig().REACT_APP_MIDGARD_URL

  const result = await thorService.get<MidgardActionsResponse>(
    `${midgardUrl}/actions?txid=${midgardTxid}`,
  )

  if (result.isErr()) throw result.unwrapErr()

  const { data } = result.unwrap()
  // https://gitlab.com/thorchain/thornode/-/blob/develop/common/tx.go#L22
  // responseData?.actions[0].out[0].txID should be the txId for consistency, but the outbound Tx for Thor rune swaps is actually a BlankTxId
  // so we use the buyTxId for completion detection
  const buyTxId =
    data?.actions[0]?.status === 'success' && data?.actions[0]?.type === 'swap'
      ? midgardTxid
      : undefined

  // This will detect all the errors I have seen.
  if (data?.actions[0]?.status === 'success' && data?.actions[0]?.type !== 'swap')
    throw Error('[getTradeTxs]: trade failed')

  const standardBuyTxid = (() => {
    const outCoinAsset = data?.actions[0]?.out[0]?.coins[0]?.asset
    const isEvmCoinAsset = outCoinAsset?.startsWith('ETH.') || outCoinAsset?.startsWith('AVAX.')
    return isEvmCoinAsset && buyTxId ? `0x${buyTxId}` : buyTxId
  })()?.toLowerCase()

  return {
    sellTxId: txHash,
    buyTxId: standardBuyTxid,
  }
}
