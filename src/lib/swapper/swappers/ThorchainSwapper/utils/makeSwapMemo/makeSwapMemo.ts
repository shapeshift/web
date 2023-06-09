import { thorchainAssetId } from '@shapeshiftoss/caip'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import { THORCHAIN_AFFILIATE_NAME } from 'lib/swapper/swappers/ThorchainSwapper/utils/constants'
import { assertIsValidMemo } from 'lib/swapper/swappers/ThorchainSwapper/utils/makeSwapMemo/assertIsValidMemo'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'

/**
 * definition of THORChain asset notation
 * https://dev.thorchain.org/thorchain-dev/concepts/memos#asset-notation
 *
 * e.g. BTC/BTC (bitcoin synth) - unaffected by this function
 * e.g. ETH.USDT-0xdac17f958d2ee523a2206206994597c13d831ec7 (usdt on ethereum) - abbreviated by this function
 */
export const abbreviateThorAssetId = (fullThorAssetId: string): string => {
  const CONTRACT_ADDRESS_DELIMITER = '-'
  const [existingPrefix, contractAddress] = fullThorAssetId.split(CONTRACT_ADDRESS_DELIMITER)

  // we can't shorten any asset that doesn't have a contract address
  if (!contractAddress) return fullThorAssetId

  /**
   * https://dev.thorchain.org/thorchain-dev/concepts/memos#asset-abbreviations
   *
   * ETH.USDT
   * ETH.USDT-ec7                                         // 3 characters  - "short"
   * ETH.USDT-6994597c13d831ec7                           // 17 characters - "medium"
   * ETH.USDT-0xdac17f958d2ee523a2206206994597c13d831ec7  // 26 characters - "long"
   */

  /**
   * for the purposes of future proofing, let's use the shortest permissible format for contract addresses
   * this has (26 + 10)^3 = 46,656 of entropy, and per the docs, the deepest pool will be used upon a collision
   */
  const SHORT_ABBREVIATION_LENGTH = 3

  // take the last n characters of the contract address (negative slice takes last n characters)
  const shortenedContractAddress = contractAddress.slice(-SHORT_ABBREVIATION_LENGTH)

  // and put it back together with the existing prefix
  return [existingPrefix, shortenedContractAddress].join(CONTRACT_ADDRESS_DELIMITER)
}

type MakeSwapMemoArgs = {
  buyAssetId: string
  destinationAddress: string | undefined
  limit: string
  affiliateBps: string
}
type MakeSwapMemo = (args: MakeSwapMemoArgs) => string

// use symbol of thor Asset?
const runeThorId = 'RUNE'
/**
 * @returns thorchain memo shortened to a max of 80 characters as described:
 * https://dev.thorchain.org/thorchain-dev/memos#mechanism-for-transaction-intent
 */
export const makeSwapMemo: MakeSwapMemo = ({
  buyAssetId,
  destinationAddress,
  limit,
  affiliateBps,
}): string => {
  const isRune = buyAssetId === thorchainAssetId
  const fullThorAssetId = isRune ? runeThorId : assetIdToPoolAssetId({ assetId: buyAssetId })

  if (!fullThorAssetId)
    throw new SwapError('[makeSwapMemo] - undefined thorAssetId for given buyAssetId', {
      code: SwapErrorType.MAKE_MEMO_FAILED,
      details: { buyAssetId },
    })

  // bch hack
  // Our bitcoin cash addresses are prefixed with `bitcoincash:`
  // But thorchain memos need to be short (under 80 bytes for utxo)
  // For this reason thorchain doesnt allow / need bitcoincash: in the memo
  const parsedDestinationAddress =
    destinationAddress && destinationAddress.includes('bitcoincash:')
      ? destinationAddress.replace('bitcoincash:', '')
      : destinationAddress

  const abbreviatedThorAssetId = abbreviateThorAssetId(fullThorAssetId)

  const memo = `s:${abbreviatedThorAssetId}:${parsedDestinationAddress}:${limit}:${THORCHAIN_AFFILIATE_NAME}:${affiliateBps}`
  assertIsValidMemo(memo)

  return memo
}
