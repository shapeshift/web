import { THORCHAIN_AFFILIATE_NAME } from './constants'

/**
 * asserts memo is valid and processes the memo to ensure our affiliate code is always present
 */
export const assertAndProcessMemo = (memo: string): string => {
  const [action] = memo.split(':')

  switch (action.toLowerCase()) {
    // SWAP:ASSET:DESTADDR:LIM/INTERVAL/QUANTITY:AFFILIATE:FEE
    case 'swap':
    case '=':
    case 's': {
      const [_action, asset, destAddr, limit, , fee] = memo.split(':')
      return `${_action}:${asset}:${destAddr}:${limit}:${THORCHAIN_AFFILIATE_NAME}:${fee || 0}`
    }
    // Deposit Savers - ADD:POOL::AFFILIATE:FEE
    // Add Liquidity - ADD:POOL:PAIREDADDR:AFFILIATE:FEE
    case 'add':
    case '+':
    case 'a': {
      const [_action, pool, maybePairedAddr, , fee] = memo.split(':')
      return `${_action}:${pool}:${maybePairedAddr ?? ''}:${THORCHAIN_AFFILIATE_NAME}:${fee || 0}`
    }
    // Withdraw Savers - WITHDRAW:POOL:BASISPOINTS
    // Withdraw Liquidity - WITHDRAW:POOL:BASISPOINTS:ASSET
    case 'withdraw':
    case '-':
    case 'wd': {
      const [_action, pool, basisPoints, maybeAsset] = memo.split(':')
      return `${_action}:${pool}:${basisPoints}:${maybeAsset ?? ''}:${THORCHAIN_AFFILIATE_NAME}:0`
    }
    // LOAN+:ASSET:DESTADDR:MINOUT:AFFILIATE:FEE
    case '$+':
    case 'loan+': {
      const [_action, asset, destAddr, minOut, , fee] = memo.split(':')
      return `${_action}:${asset}:${destAddr}:${minOut}:${THORCHAIN_AFFILIATE_NAME}:${fee || 0}`
    }
    // LOAN-:ASSET:DESTADDR:MINOUT
    case '$-':
    case 'loan-': {
      const [_action, asset, destAddr, maybeMinOut] = memo.split(':')
      return `${_action}:${asset}:${destAddr}:${maybeMinOut ?? ''}:${THORCHAIN_AFFILIATE_NAME}:0`
    }
    default:
      throw new Error(`unsupported memo: ${memo}`)
  }
}
