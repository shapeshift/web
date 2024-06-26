import { assertAndProcessMemo } from './assertAndProcessMemo'
import { MEMO_PART_DELIMITER } from './constants'

type AddFinalAssetLimitToMemoArgs = {
  /**
   * A THORChain memo, with or without a final asset MinOut.
   */
  memo: string
  /**
   * The final asset amount out to be added to the memo. THOR Aggregator will use the last two numbers as exponents.
   */
  finalAssetLimit: string
}

/**
 * A simple util that adds a final asset limit to a THORChain memo, if the memo doesn't already have one.
 */
export const addFinalAssetLimitToMemo = ({
  memo,
  finalAssetLimit,
}: AddFinalAssetLimitToMemoArgs) => {
  const memoParts = memo.split(MEMO_PART_DELIMITER)
  const [action] = memoParts

  if (!action) throw new Error(`action is required in memo: ${memo}`)

  let updatedMemo = memo

  switch (action.toLowerCase()) {
    case 'swap':
    case '=':
    case 's': {
      // SWAP:ASSET:DESTADDR:LIM/INTERVAL/QUANTITY:AFFILIATE:FEE:AGGREGATOR:FINALASSETCONTRACT:FINALASSETLIMIT
      const [
        ,
        asset,
        destAddr,
        limit,
        affiliate,
        fee,
        aggregator,
        finalAssetContract,
        _finalAssetLimit,
      ] = memoParts
      if (!aggregator) throw new Error(`aggregator is required in memo: ${memo}`)
      if (!finalAssetContract) throw new Error(`final asset contract is required in memo: ${memo}`)

      if (!_finalAssetLimit) {
        updatedMemo = `${action}:${asset}:${destAddr}:${limit}:${affiliate || ''}:${
          fee || ''
        }:${aggregator}:${finalAssetContract}:${finalAssetLimit}`
      }
      break
    }
    // No final asset amount out for loans as of now
    case '$+':
    case 'loan+':
      throw new Error(`cannot add final asset amount out to loan memo: ${memo}`)
    // No final asset amount out for loans as of now
    case '$-':
    case 'loan-':
      throw new Error(`cannot add final asset amount out to loan memo: ${memo}`)
    // No final asset amount out for Add Liquidity / Withdraw Liquidity as of now
    case 'add':
    case '+':
    case 'a':
    case 'withdraw':
    case '-':
    case 'wd':
      throw new Error(`cannot add final asset amount out to liquidity memo: ${memo}`)
    default:
      throw new Error(`unsupported memo: ${memo}`)
  }

  return assertAndProcessMemo(updatedMemo)
}
