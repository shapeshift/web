import type { utxo } from '@shapeshiftoss/common-api'

import type * as mayachain from '../../parser/mayachain'
import type * as thorchain from '../../parser/thorchain'
import type { StandardTx } from '../../types'

export type Tx = utxo.Tx

export type TxMetadata = thorchain.TxMetadata | mayachain.TxMetadata

export interface ParsedTx extends StandardTx {
  data?: TxMetadata
}

export type TxSpecific = Partial<Pick<ParsedTx, 'data' | 'trade' | 'transfers'>>

export interface SubParser<T extends Tx, U = TxSpecific> {
  parse(tx: T, address: string): Promise<U | undefined>
}
