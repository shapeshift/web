import type { ChainId } from '@shapeshiftoss/caip'
import type { SafeTxInfo, SwapSource } from '@shapeshiftoss/swapper'
import {
  CHAINFLIP_BOOST_SWAP_SOURCE,
  CHAINFLIP_DCA_BOOST_SWAP_SOURCE,
  CHAINFLIP_DCA_SWAP_SOURCE,
  MAYACHAIN_STREAM_SWAP_SOURCE,
  SwapperName,
  THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE,
  THORCHAIN_LONGTAIL_SWAP_SOURCE,
  THORCHAIN_STREAM_SWAP_SOURCE,
} from '@shapeshiftoss/swapper'
import { KnownChainIds } from '@shapeshiftoss/types'
import { Dex } from '@shapeshiftoss/unchained-client'
import { mayachain, thorchain } from '@shapeshiftoss/utils'

type GetTxBaseUrl = {
  stepSource?: Dex | SwapSource
  defaultExplorerBaseUrl: string
  isOrder?: boolean
  isRelayer?: boolean
  relayerExplorerTxLink?: string | undefined
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
    address: string | undefined
    chainId: ChainId | undefined
    maybeSafeTx: SafeTxInfo | undefined
    maybeChainflipSwapId?: string | undefined
    maybeNearIntentsDepositAddress?: string | undefined
    isRelayer?: boolean
    relayerExplorerTxLink?: string | undefined
  }

export const getTxBaseUrl = ({
  stepSource,
  defaultExplorerBaseUrl,
  isOrder,
  isRelayer,
  relayerExplorerTxLink,
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
      return thorchain.explorerTxLink
    case SwapperName.Chainflip:
    case CHAINFLIP_BOOST_SWAP_SOURCE:
    case CHAINFLIP_DCA_SWAP_SOURCE:
    case CHAINFLIP_DCA_BOOST_SWAP_SOURCE:
      return 'https://scan.chainflip.io/swaps/'
    case SwapperName.Mayachain:
    case MAYACHAIN_STREAM_SWAP_SOURCE:
      return mayachain.explorerTxLink
    case SwapperName.Relay:
      return 'https://relay.link/transaction/'
    case SwapperName.NearIntents:
      return 'https://explorer.near-intents.org/transactions/'
    case SwapperName.ButterSwap:
      return isRelayer && relayerExplorerTxLink
        ? `${relayerExplorerTxLink}tx/`
        : defaultExplorerBaseUrl
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
  address,
  chainId,
  maybeChainflipSwapId,
  maybeNearIntentsDepositAddress,
  isRelayer,
  relayerExplorerTxLink,
}: GetTxLink): string => {
  const isSafeTxHash = maybeSafeTx?.isSafeTxHash
  const id = txId ?? tradeId
  const isOrder = !!tradeId
  const baseUrl = getTxBaseUrl({
    stepSource: name,
    defaultExplorerBaseUrl,
    isOrder,
    isRelayer,
    relayerExplorerTxLink,
  })

  if (!isSafeTxHash) {
    switch (name) {
      case Dex.Thor:
      case SwapperName.Thorchain:
      case THORCHAIN_STREAM_SWAP_SOURCE:
      case THORCHAIN_LONGTAIL_SWAP_SOURCE:
      case THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE:
      case SwapperName.Mayachain:
      case MAYACHAIN_STREAM_SWAP_SOURCE:
        return `${baseUrl}${id.replace(/^0x/, '')}`
      case SwapperName.Chainflip:
      case CHAINFLIP_BOOST_SWAP_SOURCE:
      case CHAINFLIP_DCA_SWAP_SOURCE:
      case CHAINFLIP_DCA_BOOST_SWAP_SOURCE:
        return maybeChainflipSwapId
          ? `${baseUrl}${maybeChainflipSwapId}`
          : `${defaultExplorerBaseUrl}${id}`
      case SwapperName.NearIntents:
        return maybeNearIntentsDepositAddress
          ? `${baseUrl}${maybeNearIntentsDepositAddress}`
          : `${defaultExplorerBaseUrl}${id}`
      default:
        return `${baseUrl}${id}`
    }
  }

  if (!address || !chainId) return ''

  // Queued SAFE Tx, return a link to the SAFE dApp
  if (maybeSafeTx?.isQueuedSafeTx) {
    const shortname = safeChainShortNameByChainId[chainId as KnownChainIds]
    if (!shortname) {
      throw new Error(`No chain shortname found for chainId: ${chainId}`)
    }
    return `https://app.safe.global/transactions/tx?id=multisig_${address}_${id}&safe=${shortname}:${address}`
  }

  switch (name) {
    case Dex.Thor:
    case SwapperName.Thorchain:
    case THORCHAIN_STREAM_SWAP_SOURCE:
    case THORCHAIN_LONGTAIL_SWAP_SOURCE:
    case THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE:
    case SwapperName.Mayachain:
    case MAYACHAIN_STREAM_SWAP_SOURCE:
      return `${baseUrl}${(maybeSafeTx?.transaction?.transactionHash ?? '').replace(/^0x/, '')}`
    default:
      return `${baseUrl}${maybeSafeTx?.transaction?.transactionHash ?? ''}`
  }
}
