import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { SwapSource } from '@shapeshiftoss/swapper'
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
    isSafeTxHash?: boolean
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
  isSafeTxHash,
  accountId,
}: GetTxLink): string => {
  const id = txId ?? tradeId
  const isOrder = !!tradeId
  const baseUrl = getTxBaseUrl({ name, defaultExplorerBaseUrl, isOrder })

  // TODO(gomes): make this async, pass full serializedTxid (including address and AccountId, hence ChainId), and construct a correct link in the form of
  // https://app.safe.global/transactions/tx?id=multisig_<safeAddy>_<safeTxHash>&safe=avax:<safeAddy>
  // where avax is the prefix of the chain
  // Alternatively, only pass AccountId and ChainId to avoid deserialization madness

  if (isSafeTxHash && accountId) {
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
      return `${baseUrl}${id.replace(/^0x/, '')}`
    default:
      return `${baseUrl}${id}`
  }
}
