import type { SwapSource } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import { Dex } from '@shapeshiftoss/unchained-client'

import {
  THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE,
  THORCHAIN_LONGTAIL_SWAP_SOURCE,
  THORCHAIN_STREAM_SWAP_SOURCE,
} from './swapper/swappers/ThorchainSwapper/constants'

type GetBaseUrl = {
  name: SwapSource | Dex | undefined
  defaultExplorerBaseUrl: string
  isOrder?: boolean
}

type GetTxLink = GetBaseUrl &
  ({ txId: string; tradeId?: never } | { tradeId: string; txId?: never })

export const getTxBaseUrl = ({ name, defaultExplorerBaseUrl, isOrder }: GetBaseUrl): string => {
  switch (name) {
    case SwapperName.CowSwap:
    case Dex.CowSwap:
      return isOrder ? 'https://explorer.cow.fi/orders/' : 'https://explorer.cow.fi/tx/'
    case Dex.Thor:
    case SwapperName.Thorchain:
    case THORCHAIN_STREAM_SWAP_SOURCE:
    case THORCHAIN_LONGTAIL_SWAP_SOURCE:
    case THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE:
      return 'https://viewblock.io/thorchain/tx/'
    default:
      return defaultExplorerBaseUrl
  }
}

export const getTxLink = ({ name, defaultExplorerBaseUrl, txId, tradeId }: GetTxLink): string => {
  const id = txId ?? tradeId
  const isOrder = !!tradeId
  const baseUrl = getTxBaseUrl({ name, defaultExplorerBaseUrl, isOrder })

  if ([SwapperName.Thorchain, THORCHAIN_STREAM_SWAP_SOURCE].includes(name as SwapSource)) {
    return `${baseUrl}${id.replace(/^0x/, '')}`
  }

  return `${baseUrl}${id}`
}
