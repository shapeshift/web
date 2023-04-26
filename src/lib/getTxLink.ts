import { Dex } from '@shapeshiftoss/unchained-client'
import type { SwapSource } from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'

type GetBaseUrl = {
  name: SwapSource['name'] | Dex | undefined
  defaultExplorerBaseUrl: string
  isOrder?: boolean
}

type GetTxLink = GetBaseUrl &
  ({ txId: string; tradeId?: never } | { tradeId: string; txId?: never })

export const getTxBaseUrl = ({ name, defaultExplorerBaseUrl, isOrder }: GetBaseUrl): string => {
  switch (name) {
    case SwapperName.Osmosis:
    case Dex.Osmosis:
      return 'https://www.mintscan.io/osmosis/txs/'
    case SwapperName.CowSwap:
    case Dex.CowSwap:
      return isOrder ? 'https://explorer.cow.fi/orders/' : 'https://explorer.cow.fi/tx/'
    case Dex.Thor:
    case SwapperName.Thorchain:
      return isOrder ? defaultExplorerBaseUrl : 'https://viewblock.io/thorchain/tx/'
    default:
      return defaultExplorerBaseUrl
  }
}

export const getTxLink = ({ name, defaultExplorerBaseUrl, txId, tradeId }: GetTxLink): string => {
  const id = txId ?? tradeId
  const isOrder = !!tradeId
  const baseUrl = getTxBaseUrl({ name, defaultExplorerBaseUrl, isOrder })
  return `${baseUrl}${id}`
}
