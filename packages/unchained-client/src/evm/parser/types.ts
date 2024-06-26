import type { evm } from '@shapeshiftoss/common-api'

import type * as thorchain from '../../parser/thorchain'
import type { StandardTx } from '../../types'
import type * as bep20 from '../bnbsmartchain/parser/bep20'
import type * as cowswap from '../ethereum/parser/cowswap'
import type * as foxy from '../ethereum/parser/foxy'
import type * as uniV2 from '../ethereum/parser/uniV2'
import type * as weth from '../ethereum/parser/weth'
import type * as arbitrumBridge from '../parser/arbitrumBridge'
import type * as erc20 from '../parser/erc20'
import type * as nft from '../parser/nft'
import type * as rfox from '../parser/rfox'
import type * as zrx from '../parser/zrx'

export type Tx = evm.Tx

export type TxMetadata =
  | bep20.TxMetadata
  | cowswap.TxMetadata
  | erc20.TxMetadata
  | foxy.TxMetadata
  | thorchain.TxMetadata
  | uniV2.TxMetadata
  | weth.TxMetadata
  | zrx.TxMetadata
  | nft.TxMetadata
  | rfox.TxMetadata
  | arbitrumBridge.TxMetadata

export interface ParsedTx extends StandardTx {
  data?: TxMetadata
}

export type TxSpecific = Partial<Pick<ParsedTx, 'trade' | 'transfers' | 'data'>>

export interface SubParser<T extends Tx, U = TxSpecific> {
  parse(tx: T, address: string): Promise<U | undefined>
}
