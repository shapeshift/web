import { assertAndProcessMemo } from './assertAndProcessMemo'
import { MEMO_PART_DELIMITER } from './constants'

type AddLimitToMemoArgs = {
  /**
   * A THORChain memo, with or without a limit/MinOut.
   */
  memo: string
  /**
   * The final asset amount out to be added to the memo. THOR Aggregator will use the last two numbers as exponents.
   */
  finalAssetAmountOut: string
}

/**
 * A simple util that adds a final asset limit to a THORChain memo, if the memo doesn't already have one.
 */
export const addFinalAssetLimitToMemo = ({ memo, finalAssetAmountOut }: AddLimitToMemoArgs) => {
  const memoParts = memo.split(MEMO_PART_DELIMITER)
  const [action] = memoParts

  if (!action) throw new Error(`action is required in memo: ${memo}`)

  let updatedMemo = memo

  switch (action.toLowerCase()) {
    case 'swap':
    case '=':
    case 's': {
      // SWAP:ASSET:DESTADDR:LIM/INTERVAL/QUANTITY:AFFILIATE:FEE:AGGREGATOR:FINALASSETCONTRACT:FINALASSETAMOUNTOUT
      const [
        ,
        asset,
        destAddr,
        limit,
        affiliate,
        fee,
        aggregator,
        finalAssetContract,
        _finalAssetAmountOut,
      ] = memoParts
      if (!_finalAssetAmountOut) {
        updatedMemo = `${action}:${asset}:${destAddr}:${limit}:${affiliate || ''}:${
          fee || ''
        }:${aggregator}:${finalAssetContract}:${finalAssetAmountOut}`
      }
      break
    }
    // No final asset amount out for loans as of now
    case '$+':
    case 'loan+':
      break
    // No final asset amount out for loans as of now
    case '$-':
    case 'loan-':
      break
    // No final asset amount out for Add Liquidity / Withdraw Liquidity as of now
    case 'add':
    case '+':
    case 'a':
    case 'withdraw':
    case '-':
    case 'wd':
      break
    default:
      throw new Error(`unsupported memo: ${memo}`)
  }

  return assertAndProcessMemo(updatedMemo)
}
