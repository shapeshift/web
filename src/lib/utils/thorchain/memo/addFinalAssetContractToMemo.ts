import { MEMO_PART_DELIMITER } from './constants'

type AddLimitToMemoArgs = {
  /**
   * A THORChain memo, with or without a limit/MinOut.
   */
  memo: string
  /**
   * The final asset contract, can be shortened.
   */
  finalAssetContract: string
}

/**
 * A simple util that adds the final asset contract address to a THORChain memo, if the memo doesn't already have one.
 */
export const addFinalAssetContractToMemo = ({ memo, finalAssetContract }: AddLimitToMemoArgs) => {
  const memoParts = memo.split(MEMO_PART_DELIMITER)
  const [action] = memoParts

  if (!action) throw new Error(`action is required in memo: ${memo}`)

  let updatedMemo = memo

  switch (action.toLowerCase()) {
    case 'swap':
    case '=':
    case 's': {
      // SWAP:ASSET:DESTADDR:LIM/INTERVAL/QUANTITY:AFFILIATE:FEE:AGGREGATOR:FINALASSETCONTRACT
      const [, asset, destAddr, limit, affiliate, fee, aggregator, _finalAssetContract] = memoParts
      if (!_finalAssetContract) {
        updatedMemo = `${action}:${asset}:${destAddr}:${limit}:${affiliate || ''}:${
          fee || ''
        }:${aggregator}:${finalAssetContract}`
      }
      break
    }
    // No final asset contract for loans
    case '$+':
    case 'loan+':
      break
    // No final asset contract for loans
    case '$-':
    case 'loan-':
      break
    // No final asset contract for Add Liquidity / Withdraw Liquidity as of now
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

  return updatedMemo
}
