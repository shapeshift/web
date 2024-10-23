import type * as solana from '../../generated/solana'
import type { StandardTx } from '../../types'

export * from '../../generated/solana'

export type Tx = solana.Tx

export interface ParsedTx extends StandardTx {}

export type TxSpecific = Partial<Pick<ParsedTx, 'trade' | 'transfers'>>

export interface SubParser<T extends Tx, U = TxSpecific> {
  parse(tx: T, address: string): Promise<U | undefined>
}
