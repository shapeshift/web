import { SwapperName } from '@shapeshiftoss/swapper'
import { Dex } from '@shapeshiftoss/unchained-client'

type GetTxLink = {
  name: SwapperName | Dex | undefined
  defaultExplorerBaseUrl: string
  txId: string
}

export const getTxLink = ({ name, defaultExplorerBaseUrl, txId }: GetTxLink) => {
  switch (name) {
    case SwapperName.Osmosis:
    case Dex.Osmosis:
      return `https://www.mintscan.io/osmosis/txs/${txId}`
    case SwapperName.CowSwap:
    case Dex.CowSwap:
      return `https://explorer.cow.fi/orders/${txId}`
    case SwapperName.Thorchain:
    case Dex.Thor:
      return `https://v2.viewblock.io/thorchain/tx/${txId}`
    default:
      return `${defaultExplorerBaseUrl}${txId}`
  }
}
