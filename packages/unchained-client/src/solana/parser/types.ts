import type * as solana from '../../generated/solana'
import type * as thorchain from '../../parser/thorchain'
import type { StandardTx } from '../../types'

export * from '../../generated/solana'

export type Tx = solana.Tx

export type TxMetadata = thorchain.TxMetadata

export interface ParsedTx extends StandardTx {
  data?: TxMetadata
}

export type TxSpecific = Partial<Pick<ParsedTx, 'data' | 'trade' | 'transfers'>>

export interface SubParser<T extends Tx, U = TxSpecific> {
  parse(tx: T, address: string): Promise<U | undefined>
}
