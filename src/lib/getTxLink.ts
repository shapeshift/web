import type { Trade } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { Dex } from '@shapeshiftoss/unchained-client'
import type { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

type getTxLinkFromTxArgs = {
  tx: Tx
  defaultExplorerBaseUrl: string
}

export const getTxLink = ({ tx, defaultExplorerBaseUrl }: getTxLinkFromTxArgs) => {
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

type getTxLinkFromTradeArgs = {
  trade: Trade<KnownChainIds> | undefined
  defaultExplorerBaseUrl: string
  txId: string
}

export const getTxLinkFromTrade = ({
  trade,
  defaultExplorerBaseUrl,
  txId,
}: getTxLinkFromTradeArgs) => {
  switch (trade?.sources[0]?.name) {
    case SwapperName.Osmosis:
      return `https://www.mintscan.io/osmosis/txs/${txId}`
    case SwapperName.CowSwap:
      return `https://explorer.cow.fi/orders/${txId}`
    case SwapperName.Thorchain:
      return `https://v2.viewblock.io/thorchain/tx/${txId}`
    default:
      return `${defaultExplorerBaseUrl}${txId}`
  }
}
