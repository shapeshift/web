import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { SafeTxInfo, SwapSource } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import {
  THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE,
  THORCHAIN_LONGTAIL_SWAP_SOURCE,
  THORCHAIN_STREAM_SWAP_SOURCE,
} from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/constants'
import { KnownChainIds } from '@shapeshiftoss/types'
import { Dex } from '@shapeshiftoss/unchained-client'

type GetTxBaseUrl = {
  name?: Dex | SwapSource
  defaultExplorerBaseUrl: string
  isOrder?: boolean
}

// An eip-3770 compliant mapping of ChainId to chain shortname
// https://github.com/safe-global/safe-core-sdk/blob/ea0d5018a93f294dfd891e6c8963edcb96431876/packages/protocol-kit/src/utils/eip-3770/config.ts
export const safeChainShortNameByChainId: Partial<Record<KnownChainIds, string>> = {
  [KnownChainIds.EthereumMainnet]: 'eth',
  [KnownChainIds.AvalancheMainnet]: 'avax',
  [KnownChainIds.OptimismMainnet]: 'oeth',
  [KnownChainIds.BnbSmartChainMainnet]: 'bnb',
  [KnownChainIds.PolygonMainnet]: 'matic',
  [KnownChainIds.GnosisMainnet]: 'gno',
  [KnownChainIds.ArbitrumMainnet]: 'arb1',
  [KnownChainIds.ArbitrumNovaMainnet]: 'arb-nova',
  [KnownChainIds.BaseMainnet]: 'base',
}
type GetTxLink = GetTxBaseUrl &
  ({ txId: string; tradeId?: never } | { tradeId: string; txId?: never }) & {
    // TODO(gomes): make me required in a follow-up and have SAFE TxIds working holistically
    accountId?: AccountId | undefined
    maybeSafeTx: SafeTxInfo | undefined
  }

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
  maybeSafeTx,
  accountId,
}: GetTxLink): string => {
  const isSafeTxHash = maybeSafeTx?.isSafeTxHash
  const id = txId ?? tradeId
  const isOrder = !!tradeId
  const baseUrl = getTxBaseUrl({ name, defaultExplorerBaseUrl, isOrder })

  if (!isSafeTxHash) {
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

  if (!accountId) return ''

  // Queued SAFE Tx, return a link to the SAFE dApp
  if (maybeSafeTx?.isQueuedSafeTx) {
    const { chainId, account: safeAddress } = fromAccountId(accountId)
    const shortname = safeChainShortNameByChainId[chainId as KnownChainIds]
    if (!shortname) {
      throw new Error(`No chain shortname found for chainId: ${chainId}`)
    }
    return `https://app.safe.global/transactions/tx?id=multisig_${safeAddress}_${id}&safe=${shortname}:${safeAddress}`
  }

  // Executed SAFE Tx, return good ol' Tx link
  if (!isSafeTxHash) {
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

  return ''
}
