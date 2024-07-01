import { assertAndProcessMemo } from './assertAndProcessMemo'
import { MEMO_PART_DELIMITER } from './constants'

type AddLimitToMemoArgs = {
  /**
   * A THORChain memo, with or without a limit/MinOut.
   */
  memo: string
  /**
   * The limit/minout to be added to the memo. Must be in THOR base unit, or problems.
   */
  limit: string
}

/**
 * A simple util that adds a limit to a THORChain memo, if the memo doesn't already have one.
 * This is made to be composable, do one thing, and do it well.
 * If you need to handle slippage concerns, this should be done beforehand, with addLimitToMemo/assertAndProcessMemo being the final steps.
 */
export const addLimitToMemo = ({ memo, limit }: AddLimitToMemoArgs) => {
  const memoParts = memo.split(MEMO_PART_DELIMITER)
  const [action] = memoParts

  if (!action) throw new Error(`action is required in memo: ${memo}`)

  let updatedMemo = memo

  switch (action.toLowerCase()) {
    case 'swap':
    case '=':
    case 's': {
      // SWAP:ASSET:DESTADDR:LIM/INTERVAL/QUANTITY:AFFILIATE:FEE
      const [, asset, destAddr, _limit, affiliate, fee] = memoParts
      if (!_limit) {
        updatedMemo = `${action}:${asset}:${destAddr}:${limit}:${affiliate || ''}:${fee || ''}`
      }
      break
    }
    case '$+':
    case 'loan+': {
      // LOAN+:ASSET:DESTADDR:MINOUT:AFFILIATE:FEE
      const [, asset, destAddr, _minOut, affiliate, fee] = memoParts
      if (!_minOut) {
        updatedMemo = `${action}:${asset}:${destAddr}:${limit}:${affiliate || ''}:${fee || ''}`
      }
      break
    }
    case '$-':
    case 'loan-': {
      // LOAN-:ASSET:DESTADDR:MINOUT
      const [, asset, destAddr, _minOut] = memoParts
      if (!_minOut) {
        updatedMemo = `${action}:${asset}:${destAddr}:${limit}`
      }
      break
    }
    // No MinOut for Add Liquidity / Withdraw Liquidity as of now
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
