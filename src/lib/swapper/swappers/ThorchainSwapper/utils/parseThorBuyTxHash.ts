import type { MidgardActionsResponse } from '../types'

const THORCHAIN_EVM_CHAINS = ['ETH', 'AVAX', 'BSC'] as const

export const parseThorBuyTxHash = (
  sellTxId: string,
  thorActionsData: MidgardActionsResponse,
): string | undefined => {
  const outTxs = thorActionsData.actions[0]?.out

  if (!outTxs?.length) return

  const latestOutTx = outTxs[outTxs.length - 1]
  const latestTxId = latestOutTx.txID

  // outbound rune transactions do not have a txid as they are processed internally
  if (!latestTxId) return sellTxId

  const isEvmCoinAsset = THORCHAIN_EVM_CHAINS.some(
    thorEvmChain => latestOutTx.coins[0].asset?.startsWith(thorEvmChain),
  )

  return isEvmCoinAsset ? `0x${latestTxId}` : latestTxId
}
