import type { ChainId } from '@shapeshiftoss/caip'
import {
  avalancheChainId,
  bchChainId,
  binanceChainId,
  bscChainId,
  btcChainId,
  CHAIN_NAMESPACE,
  cosmosChainId,
  dogeChainId,
  ethChainId,
  fromChainId,
  ltcChainId,
  thorchainChainId,
} from '@shapeshiftoss/caip'
import { chainIdToChainLabel } from '@shapeshiftoss/chain-adapters'
import { assertUnreachable, bnOrZero } from '@shapeshiftoss/utils'
import assert from 'assert'
import WAValidator from 'multicoin-address-validator'

import {
  LIMIT_PART_DELIMITER,
  MEMO_PART_DELIMITER,
  POOL_PART_DELIMITER,
  THORCHAIN_AFFILIATE_NAME,
} from '../constants'

const thorChainAssetToChainId: Map<string, ChainId> = new Map([
  ['ETH', ethChainId],
  ['AVAX', avalancheChainId],
  ['BTC', btcChainId],
  ['BCH', bchChainId],
  ['LTC', ltcChainId],
  ['BNB', binanceChainId],
  ['DOGE', dogeChainId],
  ['GAIA', cosmosChainId],
  ['RUNE', thorchainChainId],
  ['THOR', thorchainChainId],
  ['BSC', bscChainId],
])

export const isValidMemoAddress = (chainId: ChainId, thorId: string, address: string): boolean => {
  switch (true) {
    case thorId.startsWith('ETH.'):
    case thorId.startsWith('BSC.'):
    case thorId.startsWith('AVAX.'):
    case thorId.startsWith('BTC.'):
    case thorId.startsWith('BCH.'):
    case thorId.startsWith('LTC.'):
    case thorId.startsWith('BNB.'):
    case thorId.startsWith('DOGE.'): {
      const chainLabel = chainIdToChainLabel(chainId)
      return WAValidator.validate(address, chainLabel)
    }
    case thorId.startsWith('GAIA.'):
      return address.startsWith('cosmos')
    // Note that this case doesn't contain a dot
    // See https://github.com/shapeshift/lib/blob/6b5c9c8e855ffb68d865cfae8f545e7a819a9667/packages/swapper/src/swappers/thorchain/utils/makeSwapMemo/makeSwapMemo.ts#L10
    // RUNE isn't a pool, it is the native asset of the THORChain network
    case thorId.startsWith('RUNE'):
    case thorId.startsWith('THOR'):
      return address.startsWith('thor')
    default:
      return false
  }
}

export const assertIsValidMemo = (memo: string, chainId: ChainId, affiliateBps: string): void => {
  const [, pool, address, limitComponent, affiliate, memoAffiliateBps] =
    memo.split(MEMO_PART_DELIMITER)

  if (!pool) throw new Error(`pools is required in memo: ${memo}`)
  const thorchainAsset = pool.split(POOL_PART_DELIMITER)[0]
  if (!thorchainAsset) throw new Error(`thorchainAsset is required in memo: ${memo}`)

  const buyAssetChainId = thorChainAssetToChainId.get(thorchainAsset)

  if (!address) throw new Error(`address is required in memo: ${memo}`)

  const isAddressValid = buyAssetChainId
    ? isValidMemoAddress(buyAssetChainId, pool, address)
    : undefined

  if (!isAddressValid) {
    throw Error(`memo ${memo} invalid`)
  }

  const [limit, streamingNumSwaps, streamingNumBlocks] = (limitComponent ?? '').split(
    LIMIT_PART_DELIMITER,
  )

  const isStreamingSwap = streamingNumSwaps || streamingNumBlocks

  if (isStreamingSwap && (!streamingNumSwaps || !/^\d+$/.test(streamingNumSwaps))) {
    throw Error(`streamingNumSwaps '${streamingNumSwaps}' is not a valid number`)
  }

  if (isStreamingSwap && (!streamingNumBlocks || !/^\d+$/.test(streamingNumBlocks))) {
    throw Error(`streamingNumBlocks '${streamingNumBlocks}' is not a valid number`)
  }

  // Check if limit is a valid number
  if (!bnOrZero(limit).isInteger()) {
    throw Error(`limit ${limit} is not a valid number`)
  }

  // Check if affiliate is "ss"
  if (affiliate !== THORCHAIN_AFFILIATE_NAME) {
    throw Error(`affiliate ${affiliate} is not ${THORCHAIN_AFFILIATE_NAME}`)
  }

  // Check if affiliateBps is a number between and including 0 and 1000 (the valid range for THORSwap)
  const affiliateBpsNum = bnOrZero(memoAffiliateBps)
  if (!bnOrZero(limit).isInteger() || affiliateBpsNum.lt(0) || affiliateBpsNum.gt(1000)) {
    throw Error(`affiliateBps ${memoAffiliateBps} is not a number between 0 and 1000`)
  }

  assert(affiliateBpsNum.eq(affiliateBps), 'incorrect affiliateBps')

  const { chainNamespace } = fromChainId(chainId)

  const maxMemoLength = (() => {
    switch (chainNamespace) {
      case CHAIN_NAMESPACE.Utxo:
        // BTC (and likely other UTXO coins) can only support up to 80 character (byte) memos
        return 80
      case CHAIN_NAMESPACE.Evm:
        return Infinity
      case CHAIN_NAMESPACE.CosmosSdk:
        // Cosmos (and likely other Cosmos SDK coins) can only support up to 256 character (byte) memos
        return 256
      default:
        assertUnreachable(chainNamespace)
    }
  })()

  if (memo.length > maxMemoLength) {
    throw Error(`memo length exceeds ${maxMemoLength} characters`)
  }
}
