import type { ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'

export const isUtxoChainId = (chainId: ChainId): boolean =>
  fromChainId(chainId).chainNamespace === CHAIN_NAMESPACE.Utxo
