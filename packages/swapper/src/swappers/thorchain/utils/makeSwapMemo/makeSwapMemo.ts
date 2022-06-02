import { adapters } from '@shapeshiftoss/caip'

import { SwapError, SwapErrorTypes } from '../../../../api'

// BTC (and likely other utxo coins) can only support up to 80 character memos
const MAX_LENGTH = 80

/**
 * @returns thorchain memo shortened to a max of 80 characters as described:
 * https://dev.thorchain.org/thorchain-dev/memos#mechanism-for-transaction-intent
 */
export const makeSwapMemo = ({
  buyAssetId,
  destinationAddress,
  limit
}: {
  buyAssetId: string
  destinationAddress: string
  limit: string
}): string => {
  const thorId = adapters.assetIdToPoolAssetId({ assetId: buyAssetId })
  if (!thorId)
    throw new SwapError('[makeSwapMemo] - undefined thorId for given buyAssetId', {
      code: SwapErrorTypes.MAKE_MEMO_FAILED,
      details: { buyAssetId }
    })

  const memo = `s:${thorId}:${destinationAddress}:${limit}`
  if (memo.length <= MAX_LENGTH) return memo
  const abbreviationAmount = memo.length - MAX_LENGTH

  if (abbreviationAmount > 39)
    throw new SwapError('[makeSwapMemo] - too much abbreviation for accurate matching', {
      code: SwapErrorTypes.MAKE_MEMO_FAILED
    })
  // delimeter between ticker and id allowing us to abbreviate the id: https://dev.thorchain.org/thorchain-dev/memos#asset-notation
  const delimeterIndex = memo.indexOf('-') + 1
  if (!delimeterIndex) {
    throw new SwapError('[makeSwapMemo] - unable to abbreviate asset, no delimeter found', {
      code: SwapErrorTypes.MAKE_MEMO_FAILED
    })
  }
  return memo.replace(memo.slice(delimeterIndex, delimeterIndex + abbreviationAmount), '')
}
