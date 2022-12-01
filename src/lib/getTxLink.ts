import { Dex } from '@shapeshiftoss/unchained-client'
import type { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

type getTxLinkArgs = {
  tx: Tx
  defaultExplorerBaseUrl: string
}
export const getTxLink = ({ tx, defaultExplorerBaseUrl }: getTxLinkArgs) => {
  switch (tx.trade?.dexName) {
    case Dex.Osmosis:
      return `https://www.mintscan.io/osmosis/txs/${tx.txid}`
    case Dex.CowSwap:
      return `https://explorer.cow.fi/orders/${tx.txid}`
    case Dex.Thor:
      return `https://v2.viewblock.io/thorchain/tx/${tx.txid}`
    default:
      return `${defaultExplorerBaseUrl}${tx.txid}`
  }
}
