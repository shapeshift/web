import type { ThorNodeStatusResponseSuccess } from '../types'

const THORCHAIN_EVM_CHAINS = ['ETH', 'AVAX', 'BSC'] as const

export const parseThorBuyTxHash = (
  sellTxId: string,
  response: ThorNodeStatusResponseSuccess,
): string | undefined => {
  const latestOutTx = response.out_txs?.[response.out_txs.length - 1]

  if (!latestOutTx) return

  // outbound rune transactions do not have a txid as they are processed internally, use sell txid
  if (latestOutTx.chain === 'THOR') return sellTxId

  const isEvmCoinAsset = THORCHAIN_EVM_CHAINS.some(chain => chain === latestOutTx.chain)

  return isEvmCoinAsset ? `0x${latestOutTx.id}` : latestOutTx.id
}
