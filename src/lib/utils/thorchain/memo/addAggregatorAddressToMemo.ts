import { MEMO_PART_DELIMITER } from './constants'

type AddShortenedAggregatorToMemoArgs = {
  /**
   * A THORChain memo, with or without aggregator address.
   */
  memo: string
  /**
   * The aggregator address that will be shortened to two chars.
   */
  aggregatorAddress: string
}

// THORChain themselves use 2 characters but it might collide at some point in the future (https://gitlab.com/thorchain/thornode/-/blob/develop/x/thorchain/aggregators/dex_mainnet_current.go)
export const addAggregatorAddressToMemo = ({
  memo,
  aggregatorAddress,
}: AddShortenedAggregatorToMemoArgs) => {
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
      break
    // No Aggregator for loans
    case '$-':
    case 'loan-':
      break
    // No Aggregator for Add Liquidity / Withdraw Liquidity as of now
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
