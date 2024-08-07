import type { SwapSource } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import {
  THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE,
  THORCHAIN_LONGTAIL_SWAP_SOURCE,
  THORCHAIN_STREAM_SWAP_SOURCE,
} from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/constants'
import { Dex } from '@shapeshiftoss/unchained-client'

type GetTxBaseUrl = {
  name?: Dex | SwapSource
  defaultExplorerBaseUrl: string
  isOrder?: boolean
}

type GetTxLink = GetTxBaseUrl &
  ({ txId: string; tradeId?: never } | { tradeId: string; txId?: never }) & { isSafeTxid: boolean }

export const getTxBaseUrl = ({ name, defaultExplorerBaseUrl, isOrder }: GetTxBaseUrl): string => {
  switch (name) {
    case Dex.CowSwap:
    case SwapperName.CowSwap:
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

export const getTxLink = ({
  name,
  defaultExplorerBaseUrl,
  txId,
  tradeId,
  isSafeTxid,
}: GetTxLink): string => {
  const id = txId ?? tradeId
  const isOrder = !!tradeId
  const baseUrl = getTxBaseUrl({ name, defaultExplorerBaseUrl, isOrder })

  // TODO(gomes): make this async, pass full serializedTxid (including address and AccountId, hence ChainId), and construct a correct link in the form of
  // https://app.safe.global/transactions/tx?id=multisig_<safeAddy>_<safeTxHash>&safe=avax:<safeAddy>
  // where avax is the prefix of the chain
  // Alternatively, only pass AccountId and ChainId to avoid deserialization madness

  switch (name) {
    case Dex.Thor:
    case SwapperName.Thorchain:
    case THORCHAIN_STREAM_SWAP_SOURCE:
    case THORCHAIN_LONGTAIL_SWAP_SOURCE:
    case THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE:
      return `${baseUrl}${id.replace(/^0x/, '')}`
    default:
      return `${baseUrl}${id}`
  }
}
