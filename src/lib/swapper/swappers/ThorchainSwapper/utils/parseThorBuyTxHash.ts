import type { MidgardActionsResponse } from '../types'

const THORCHAIN_EVM_CHAINS = ['ETH', 'AVAX', 'BSC'] as const

export const parseThorBuyTxHash = (
  sellTxId: string,
  thorActionsData: MidgardActionsResponse,
): string | undefined => {
  const inCoinAsset: string | undefined = thorActionsData.actions[0]?.in[0]?.coins[0]?.asset
  const outCoinAsset: string | undefined = thorActionsData.actions[0]?.out[0]?.coins[0]?.asset
  const isDoubleSwap = outCoinAsset !== 'THOR.RUNE' && inCoinAsset !== 'THOR.RUNE'

  // swaps into rune aren't double swaps so don't have a second tx (buy tx)
  if (!isDoubleSwap) return sellTxId

  const isEvmCoinAsset = THORCHAIN_EVM_CHAINS.some(
    thorEvmChain => outCoinAsset?.startsWith(thorEvmChain),
  )

  const buyTxId = thorActionsData.actions[0]?.out[0]?.txID
  return isEvmCoinAsset && buyTxId ? `0x${buyTxId}` : buyTxId
}
