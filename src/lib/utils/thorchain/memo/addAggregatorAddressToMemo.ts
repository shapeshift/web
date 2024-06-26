import { MEMO_PART_DELIMITER } from './constants'

type AddAggregatorAddressToMemoArgs = {
  /**
   * A THORChain memo, with or without aggregator address.
   */
  memo: string
  /**
   * The aggregator address.
   */
  aggregatorAddress: string
}

export const addAggregatorAddressToMemo = ({
  memo,
  aggregatorAddress,
}: AddAggregatorAddressToMemoArgs) => {
  const memoParts = memo.split(MEMO_PART_DELIMITER)
  const [action] = memoParts

  if (!action) throw new Error(`action is required in memo: ${memo}`)

  let updatedMemo = memo

  switch (action.toLowerCase()) {
    case 'swap':
    case '=':
    case 's': {
      // SWAP:ASSET:DESTADDR:LIM/INTERVAL/QUANTITY:AFFILIATE:FEE:AGGREGATOR
      const [, asset, destAddr, limit, affiliate, fee, _aggregatorAddress] = memoParts
      if (!_aggregatorAddress) {
        updatedMemo = `${action}:${asset}:${destAddr}:${limit}:${affiliate || ''}:${
          fee || ''
        }:${aggregatorAddress}`
      }
      break
    }
    // No Aggregator for loans
    case '$+':
    case 'loan+':
      throw new Error(`cannot add aggregator to loan memo: ${memo}`)
    // No Aggregator for loans
    case '$-':
    case 'loan-':
      throw new Error(`cannot add aggregator to loan memo: ${memo}`)
    // No Aggregator for Add Liquidity / Withdraw Liquidity as of now
    case 'add':
    case '+':
    case 'a':
    case 'withdraw':
    case '-':
    case 'wd':
      throw new Error(`cannot add aggregator to liquidity memo: ${memo}`)
    default:
      throw new Error(`unsupported memo: ${memo}`)
  }

  return updatedMemo
}
