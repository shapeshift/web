import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId, solanaChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { bn, convertPrecision, isToken } from '@shapeshiftoss/utils'
import { Err, Ok } from '@sniptt/monads'
import { PublicKey, VersionedTransaction } from '@solana/web3.js'
import { getAddress } from 'viem'

import { TradeQuoteError } from '../../../../types'
import { makeSwapErrorRight } from '../../../../utils'
import type { BebopSupportedChainId } from '../../types'
import { BEBOP_NATIVE_MARKER, bebopSupportedChainIds } from '../../types'

export const isSolanaChainId = (chainId: ChainId): boolean => {
  return chainId === solanaChainId
}

export const assetIdToBebopToken = (assetId: AssetId): string => {
  if (!isToken(assetId)) return BEBOP_NATIVE_MARKER
  const { assetReference } = fromAssetId(assetId)
  return getAddress(assetReference)
}

export const assetIdToBebopSolanaToken = (assetId: AssetId): string => {
  const { assetReference, chainId } = fromAssetId(assetId)
  if (chainId === solanaChainId && !isToken(assetId)) {
    return 'So11111111111111111111111111111111111111112'
  }
  return assetReference
}

export const isSupportedChainId = (chainId: ChainId): chainId is BebopSupportedChainId => {
  return bebopSupportedChainIds.includes(chainId as BebopSupportedChainId)
}

export const assertValidTrade = ({
  buyAsset,
  sellAsset,
}: {
  buyAsset: Asset
  sellAsset: Asset
}) => {
  const sellAssetChainId = sellAsset.chainId
  const buyAssetChainId = buyAsset.chainId

  if (!isSupportedChainId(sellAssetChainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (!isSupportedChainId(buyAssetChainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: buyAsset.chainId },
      }),
    )
  }

  if (sellAssetChainId !== buyAssetChainId) {
    return Err(
      makeSwapErrorRight({
        message: `cross-chain not supported - both assets must be on chainId ${sellAsset.chainId}`,
        code: TradeQuoteError.CrossChainNotSupported,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  return Ok(true)
}

/**
 * Bebop's /order endpoint has a bug where it hardcodes the taker signature placement
 * at the last signer index. When the taker's pubkey bytes sort before the maker's,
 * the taker ends up at an earlier index, and Bebop places the sig in the wrong slot.
 * This causes ghost txs (order returns "Success" but tx silently fails on-chain).
 *
 * Returns true if the taker is at the expected index (safe to execute), false otherwise.
 * Returns false on decode failure.
 */
export const isBebopSolanaTxSafe = (solanaTxBase64: string, takerAddress: string): boolean => {
  try {
    const tx = VersionedTransaction.deserialize(Buffer.from(solanaTxBase64, 'base64'))
    const numSigners = tx.message.header.numRequiredSignatures
    const signerKeys = tx.message.staticAccountKeys.slice(0, numSigners)
    const takerPubkey = new PublicKey(takerAddress)
    const takerIndex = signerKeys.findIndex(key => key.equals(takerPubkey))
    const expectedIndex = numSigners - 1 // Bebop hardcodes to last signer slot

    if (takerIndex !== expectedIndex) {
      console.warn(
        `[Bebop Solana] Taker signer index ${takerIndex}, expected ${expectedIndex}. Rejecting to avoid ghost tx.`,
      )
      return false
    }
    return true
  } catch (e) {
    console.error(`[Bebop Solana] Failed to decode tx for signer check: ${(e as Error).message}`)
    return false
  }
}

export const calculateRate = ({
  buyAmount,
  sellAmount,
  buyAsset,
  sellAsset,
}: {
  buyAmount: string
  sellAmount: string
  buyAsset: Asset
  sellAsset: Asset
}) => {
  return convertPrecision({
    value: buyAmount,
    inputExponent: buyAsset.precision,
    outputExponent: sellAsset.precision,
  })
    .dividedBy(bn(sellAmount))
    .toFixed()
}
