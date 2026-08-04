import type { ChainId } from '@shapeshiftoss/caip'
import type { SafeTxInfo } from '@shapeshiftoss/swapper'
import { KnownChainIds } from '@shapeshiftoss/types'
import { Dex } from '@shapeshiftoss/unchained-client'
import { mayachain, thorchain } from '@shapeshiftoss/utils'

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
  [KnownChainIds.BaseMainnet]: 'base',
}

type GetTxLink = {
  dexName?: Dex
  explorerBaseUrl: string
  txId: string
  address: string | undefined
  chainId: ChainId | undefined
  maybeSafeTx: SafeTxInfo | undefined
}

export const getTxLink = ({
  dexName,
  explorerBaseUrl,
  txId,
  maybeSafeTx,
  address,
  chainId,
}: GetTxLink): string => {
  if (maybeSafeTx?.isSafeTxHash) {
    if (!address || !chainId) return ''

    // Queued SAFE Tx, return a link to the SAFE dApp
    if (maybeSafeTx.isQueuedSafeTx) {
      const shortname = safeChainShortNameByChainId[chainId as KnownChainIds]
      if (!shortname) {
        throw new Error(`No chain shortname found for chainId: ${chainId}`)
      }
      return `https://app.safe.global/transactions/tx?id=multisig_${address}_${txId}&safe=${shortname}:${address}`
    }

    // Executed SAFE Tx, link the on chain transaction hash
    txId = maybeSafeTx.transaction?.transactionHash ?? ''
  }

  switch (dexName) {
    case Dex.CowSwap:
      return `https://explorer.cow.fi/tx/${txId}`
    case Dex.Thor:
      return `${thorchain.explorerTxLink}${txId.replace(/^0x/, '')}`
    case Dex.Maya:
      return `${mayachain.explorerTxLink}${txId.replace(/^0x/, '')}`
    default:
      return `${explorerBaseUrl}${txId}`
  }
}
