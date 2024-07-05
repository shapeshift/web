import { MEMO_PART_DELIMITER } from './constants'

type AddFinalAssetContractToMemoArgs = {
  /**
   * A THORChain memo, with or without a final asset contract.
   */
  memo: string
  /**
   * The final asset address, can be shortened.
   */
  finalAssetAddress: string
}

/**
 * A simple util that adds the final asset contract address to a THORChain memo, if the memo doesn't already have one.
 */
export const addFinalAssetAddressToMemo = ({
  memo,
  finalAssetAddress,
}: AddFinalAssetContractToMemoArgs) => {
  const memoParts = memo.split(MEMO_PART_DELIMITER)
  const [action] = memoParts

  if (!action) throw new Error(`action is required in memo: ${memo}`)

  let updatedMemo = memo

  switch (action.toLowerCase()) {
    case 'swap':
    case '=':
    case 's': {
      // SWAP:ASSET:DESTADDR:LIM/INTERVAL/QUANTITY:AFFILIATE:FEE:AGGREGATOR:FINALASSETCONTRACT
      const [, asset, destAddr, limit, affiliate, fee, aggregator, _finalAssetAddress] = memoParts
      if (!aggregator) throw new Error(`aggregator is required in memo: ${memo}`)

      if (!_finalAssetAddress) {
        updatedMemo = `${action}:${asset}:${destAddr}:${limit}:${affiliate || ''}:${
          fee || ''
        }:${aggregator}:${finalAssetAddress}`
      }
      break
    }
    // No final asset contract for loans
    case '$+':
    case 'loan+':
      throw new Error(`cannot add final asset contract to loan memo: ${memo}`)
    // No final asset contract for loans
    case '$-':
    case 'loan-':
      throw new Error(`cannot add final asset contract to loan memo: ${memo}`)
    // No final asset contract for Add Liquidity / Withdraw Liquidity as of now
    case 'add':
    case '+':
    case 'a':
    case 'withdraw':
    case '-':
    case 'wd':
      throw new Error(`cannot add final asset contract to liquidity memo: ${memo}`)
    default:
      throw new Error(`unsupported memo: ${memo}`)
  }

  return updatedMemo
}
