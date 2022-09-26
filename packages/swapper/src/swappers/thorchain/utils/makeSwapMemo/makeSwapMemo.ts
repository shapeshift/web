import { adapters, thorchainAssetId } from '@shapeshiftoss/caip'

import { SwapError, SwapErrorTypes } from '../../../../api'
import { THORCHAIN_AFFILIATE_BIPS, THORCHAIN_AFFILIATE_NAME } from '../constants'

// BTC (and likely other utxo coins) can only support up to 80 character memos
const MAX_LENGTH = 80

// use symbol of thor Asset?
const runeThorId = 'RUNE'
/**
 * @returns thorchain memo shortened to a max of 80 characters as described:
 * https://dev.thorchain.org/thorchain-dev/memos#mechanism-for-transaction-intent
 */
export const makeSwapMemo = ({
  buyAssetId,
  destinationAddress,
  limit,
}: {
  buyAssetId: string
  destinationAddress: string
  limit: string
}): string => {
  const isRune = buyAssetId === thorchainAssetId
  const thorId = isRune ? runeThorId : adapters.assetIdToPoolAssetId({ assetId: buyAssetId })
  if (!thorId)
    throw new SwapError('[makeSwapMemo] - undefined thorId for given buyAssetId', {
      code: SwapErrorTypes.MAKE_MEMO_FAILED,
      details: { buyAssetId },
    })

  // bch hack
  // Our bitcoin cash addresses are prefixed with `bitcoincash:`
  // But thorchain memos need to be short (under 80 bytes for utxo)
  // For this reason thorchain doesnt allow / need bitcoincash: in the memo
  const parsedDestinationAddress = destinationAddress.includes('bitcoincash:')
    ? destinationAddress.replace('bitcoincash:', '')
    : destinationAddress

  const memo = `s:${thorId}:${parsedDestinationAddress}:${limit}:${THORCHAIN_AFFILIATE_NAME}:${THORCHAIN_AFFILIATE_BIPS}`
  if (memo.length <= MAX_LENGTH) return memo
  const abbreviationAmount = memo.length - MAX_LENGTH

  if (abbreviationAmount > 39)
    throw new SwapError('[makeSwapMemo] - too much abbreviation for accurate matching', {
      code: SwapErrorTypes.MAKE_MEMO_FAILED,
    })
  // delimeter between ticker and id allowing us to abbreviate the id: https://dev.thorchain.org/thorchain-dev/memos#asset-notation
  const delimeterIndex = memo.indexOf('-') + 1
  if (!delimeterIndex) {
    throw new SwapError('[makeSwapMemo] - unable to abbreviate asset, no delimeter found', {
      code: SwapErrorTypes.MAKE_MEMO_FAILED,
    })
  }
  return memo.replace(memo.slice(delimeterIndex, delimeterIndex + abbreviationAmount), '')
}
