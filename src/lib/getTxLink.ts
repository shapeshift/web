import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { SafeTxInfo, SwapSource } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import {
  CHAINFLIP_BOOST_SWAP_SOURCE,
  CHAINFLIP_DCA_BOOST_SWAP_SOURCE,
  CHAINFLIP_DCA_SWAP_SOURCE,
} from '@shapeshiftoss/swapper/dist/swappers/ChainflipSwapper/constants'
import {
  THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE,
  THORCHAIN_LONGTAIL_SWAP_SOURCE,
  THORCHAIN_STREAM_SWAP_SOURCE,
} from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/constants'
import { KnownChainIds } from '@shapeshiftoss/types'
import { Dex } from '@shapeshiftoss/unchained-client'

type GetTxBaseUrl = {
  stepSource?: Dex | SwapSource
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
    accountId: AccountId | undefined
    maybeSafeTx: SafeTxInfo | undefined
    maybeChainflipSwapId?: string | undefined
  }

export const getTxBaseUrl = ({
  stepSource,
  defaultExplorerBaseUrl,
  isOrder,
}: GetTxBaseUrl): string => {
  switch (stepSource) {
    case Dex.CowSwap:
    case SwapperName.CowSwap:
      return isOrder ? 'https://explorer.cow.fi/orders/' : 'https://explorer.cow.fi/tx/'
    case Dex.Thor:
    case SwapperName.Thorchain:
    case THORCHAIN_STREAM_SWAP_SOURCE:
    case THORCHAIN_LONGTAIL_SWAP_SOURCE:
    case THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE:
      return 'https://viewblock.io/thorchain/tx/'
    case SwapperName.Chainflip:
    case CHAINFLIP_BOOST_SWAP_SOURCE:
    case CHAINFLIP_DCA_SWAP_SOURCE:
    case CHAINFLIP_DCA_BOOST_SWAP_SOURCE:
      return 'https://scan.chainflip.io/swaps/'
    default:
      return defaultExplorerBaseUrl
  }
}

export const getTxLink = ({
  stepSource: name,
  defaultExplorerBaseUrl,
  txId,
  tradeId,
  maybeSafeTx,
  accountId,
  maybeChainflipSwapId,
}: GetTxLink): string => {
  const isSafeTxHash = maybeSafeTx?.isSafeTxHash
  const id = txId ?? tradeId
  const isOrder = !!tradeId
  const baseUrl = getTxBaseUrl({ stepSource: name, defaultExplorerBaseUrl, isOrder })

  if (!isSafeTxHash) {
    switch (name) {
      case Dex.Thor:
      case SwapperName.Thorchain:
      case THORCHAIN_STREAM_SWAP_SOURCE:
      case THORCHAIN_LONGTAIL_SWAP_SOURCE:
      case THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE:
        return `${baseUrl}${id.replace(/^0x/, '')}`
      case SwapperName.Chainflip:
      case CHAINFLIP_BOOST_SWAP_SOURCE:
      case CHAINFLIP_DCA_SWAP_SOURCE:
      case CHAINFLIP_DCA_BOOST_SWAP_SOURCE:
        return maybeChainflipSwapId
          ? `${baseUrl}${maybeChainflipSwapId}`
          : `${defaultExplorerBaseUrl}${id}`
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

  switch (name) {
    case Dex.Thor:
    case SwapperName.Thorchain:
    case THORCHAIN_STREAM_SWAP_SOURCE:
    case THORCHAIN_LONGTAIL_SWAP_SOURCE:
    case THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE:
      return `${baseUrl}${(maybeSafeTx?.transaction?.transactionHash ?? '').replace(/^0x/, '')}`
    default:
      return `${baseUrl}${maybeSafeTx?.transaction?.transactionHash ?? ''}`
  }
}
