import type { ChainId } from '@shapeshiftmonorepo/caip'
import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftmonorepo/caip'

export const isUtxoChainId = (chainId: ChainId): boolean =>
  fromChainId(chainId).chainNamespace === CHAIN_NAMESPACE.Utxo
