import {
  avalancheChainId,
  bchChainId,
  binanceChainId,
  btcChainId,
  ChainId,
  cosmosChainId,
  dogeChainId,
  ethChainId,
  ltcChainId,
  thorchainChainId,
} from '@shapeshiftoss/caip'
import { chainIdToChainLabel } from '@shapeshiftoss/chain-adapters'
import WAValidator from 'multicoin-address-validator'

import { SwapError, SwapErrorType } from '../../../../api'

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
])

export const isValidMemoAddress = (chainId: ChainId, thorId: string, address: string): boolean => {
  switch (true) {
    case thorId.startsWith('ETH.'):
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
      return address.startsWith('thor')
    default:
      return false
  }
}

export const assertIsValidMemo = (memo: string): void => {
  // BTC (and likely other utxo coins) can only support up to 80 character (byte) memos
  const MAX_MEMO_LENGTH = 80
  const MEMO_PART_DELIMITER = ':'
  const POOL_PART_DELIMITER = '.'

  const memoParts = memo.split(MEMO_PART_DELIMITER)
  const pool = memoParts[1]
  const address = memoParts[2]
  const buyAssetChainId = thorChainAssetToChainId.get(pool.split(POOL_PART_DELIMITER)[0])
  const isAddressValid = buyAssetChainId
    ? isValidMemoAddress(buyAssetChainId, pool, address)
    : undefined

  if (!isAddressValid) {
    throw new SwapError(`[makeSwapMemo] - memo ${memo} invalid`, {
      code: SwapErrorType.MAKE_MEMO_FAILED,
    })
  }

  if (memo.length > MAX_MEMO_LENGTH) {
    throw new SwapError(`[makeSwapMemo] - memo length exceeds ${MAX_MEMO_LENGTH} characters`, {
      code: SwapErrorType.MAKE_MEMO_FAILED,
    })
  }
}
