import type { ThorNodeTxSchema } from './types'

const EVM_CHAINS = ['ARB', 'AVAX', 'BASE', 'BSC', 'ETH'] as const

export const parseThorBuyTxHash = (
  sellTxId: string,
  latestOutTx: ThorNodeTxSchema | undefined,
  nativeChain: 'THOR' | 'MAYA',
): string | undefined => {
  if (!latestOutTx) return

  // outbound rune transactions do not have a txid as they are processed internally, use sell txid
  if (latestOutTx.chain === nativeChain) return sellTxId

  const isEvmCoinAsset = EVM_CHAINS.some(chain => chain === latestOutTx.chain)

  return isEvmCoinAsset ? `0x${latestOutTx.id}` : latestOutTx.id
}
