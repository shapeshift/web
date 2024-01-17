import type { utxo } from '@shapeshiftoss/common-api'

import type { StandardTx } from '../../types'
import type * as thorchain from './thorchain'

export type Tx = utxo.Tx

export type TxMetadata = thorchain.TxMetadata

export interface ParsedTx extends StandardTx {
  data?: TxMetadata
}

export type TxSpecific = Partial<Pick<ParsedTx, 'data' | 'trade' | 'transfers'>>

export interface SubParser<T extends Tx, U = TxSpecific> {
  parse(tx: T, address: string): Promise<U | undefined>
}
