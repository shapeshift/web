import { bn } from 'lib/bignumber/bignumber'

import { THORCHAIN_AFFILIATE_NAME } from './constants'

const assertMemoHasPool = (pool: string | undefined, memo: string): pool is string => {
  if (!pool) throw new Error(`pool is required in memo: ${memo}`)
  return true
}

const assertMemoHasAsset = (asset: string | undefined, memo: string): asset is string => {
  if (!asset) throw new Error(`asset is required in memo: ${memo}`)
  return true
}

const assertMemoHasDestAddr = (destAddr: string | undefined, memo: string): destAddr is string => {
  if (!destAddr) throw new Error(`destination address is required in memo: ${memo}`)
  return true
}

const assertMemoHasPairedAddr = (
  pairedAddr: string | undefined,
  memo: string,
): pairedAddr is string => {
  if (!pairedAddr) throw new Error(`paired address is required in memo: ${memo}`)
  return true
}

const assertMemoHasLimit = (limit: string | undefined, memo: string): limit is string => {
  if (!limit) throw new Error(`limit is required in memo: ${memo}`)
  return true
}

const assertMemoHasBasisPoints = (
  basisPoints: string | undefined,
  memo: string,
): basisPoints is string => {
  if (!basisPoints) throw new Error(`basis points is required in memo: ${memo}`)
  return true
}

const assertMemoHasAction = (action: string | undefined, memo: string): action is string => {
  if (!action) throw new Error(`action is required in memo: ${memo}`)
  return true
}

// Disabling until we validate further, as :MINOUT is optional in the quote response
// const assertMemoHasMinOut = (minOut: string, memo: string) => {
//   if (!minOut) throw new Error(`minOut is required in memo: ${memo}`)
// }

const assertIsValidLimit = (limit: string | undefined, memo: string) => {
  if (!assertMemoHasLimit(limit, memo)) return

  const maybeStreamingSwap = limit.match(/\//g)
  const [lim, interval, quantity] = limit.split('/')

  if (maybeStreamingSwap) {
    if (!(lim && interval && quantity && maybeStreamingSwap.length === 3))
      throw new Error(`invalid streaming parameters in memo: ${memo}`)
    if (!bn(lim).isInteger()) throw new Error(`limit must be an integer in memo: ${memo}`)
    if (!bn(interval).isInteger()) throw new Error(`interval is required in memo: ${memo}`)
    if (!bn(quantity).isInteger()) throw new Error(`quantity is required in memo: ${memo}`)
  }

  if (!bn(limit).gt(0)) throw new Error(`positive limit is required in memo: ${memo}`)
}

// Disabling until we validate further, as :MINOUT is optional in the quote response
// const assertIsValidMinOut = (minOut: string, memo: string) => {
//   assertMemoHasMinOut(minOut, memo)

//   if (!bn(minOut).isInteger()) throw new Error(`minOut must be an integer in memo: ${memo}`)
//   if (!bn(minOut).gt(0)) throw new Error(`positive minOut is required in memo: ${memo}`)
// }

const assertIsValidBasisPoints = (
  basisPoints: string | undefined,
  memo: string,
): basisPoints is string => {
  // Note, this is an assertion - we only do the checks for type-narrowing purposes, it *will* throw if we don't have a memo
  // so we'll never actually return the empty string below
  if (!assertMemoHasBasisPoints(basisPoints, memo)) return false

  if (!bn(basisPoints).isInteger())
    throw new Error(`basis points must be an integer in memo: ${memo}`)
  if (bn(basisPoints).lt(0) || bn(basisPoints).gt(10000))
    throw new Error(`basis points must be between 0-10000 in memo: ${memo}`)

  return true
}

/**
 * asserts memo is valid and processes the memo to ensure our affiliate code is always present
 */
export const assertAndProcessMemo = (memo: string): string => {
  const [action] = memo.split(':')

  if (!assertMemoHasAction(action, memo)) throw new Error(`action is required in memo: ${memo}`)

  switch (action.toLowerCase()) {
    case 'swap':
    case '=':
    case 's': {
      // SWAP:ASSET:DESTADDR:LIM/INTERVAL/QUANTITY:AFFILIATE:FEE
      const [_action, asset, destAddr, limit, , fee] = memo.split(':')

      assertMemoHasAsset(asset, memo)
      assertMemoHasDestAddr(destAddr, memo)
      assertIsValidLimit(limit, memo)

      return `${_action}:${asset}:${destAddr}:${limit}:${THORCHAIN_AFFILIATE_NAME}:${fee || 0}`
    }
    case 'add':
    case '+':
    case 'a': {
      const [_action, pool, maybePairedAddr, , fee] = memo.split(':')

      if (!pool) throw new Error(`pool is required in memo: ${memo}`)

      assertMemoHasPool(pool, memo)

      // Add Liquidity - ADD:POOL:PAIREDADDR:AFFILIATE:FEE
      if (pool.includes('.')) {
        if (maybePairedAddr) assertMemoHasPairedAddr(maybePairedAddr, memo)
        return `${_action}:${pool}:${maybePairedAddr ?? ''}:${THORCHAIN_AFFILIATE_NAME}:${fee || 0}`
      }

      // Deposit Savers - ADD:POOL::AFFILIATE:FEE
      if (pool.includes('/')) {
        if (maybePairedAddr) throw new Error('paired address is not supported for saver deposit')
        return `${_action}:${pool}::${THORCHAIN_AFFILIATE_NAME}:${fee || 0}`
      }

      throw new Error(`invalid pool in memo: ${memo}`)
    }
    case 'withdraw':
    case '-':
    case 'wd': {
      const [_action, pool, basisPoints, maybeAsset] = memo.split(':')

      // Note, these are assertions - we only do the checks for type-narrowing purposes, it *will* throw if we don't have a memo
      // so we'll never actually return the empty strings below
      if (!assertMemoHasPool(pool, memo)) return ''
      if (!assertMemoHasBasisPoints(basisPoints, memo)) return ''

      // Withdraw Liquidity - WITHDRAW:POOL:BASISPOINTS:ASSET
      if (pool.includes('.')) {
        if (maybeAsset) assertMemoHasAsset(maybeAsset, memo)
        assertIsValidBasisPoints(basisPoints, memo)
        return `${_action}:${pool}:${basisPoints}:${maybeAsset ?? ''}:${THORCHAIN_AFFILIATE_NAME}:0`
      }

      // Withdraw Savers - WITHDRAW:POOL:BASISPOINTS
      if (pool.includes('/')) {
        if (maybeAsset) throw new Error('asset is not supported for savers withdraw')
        assertIsValidBasisPoints(basisPoints, memo)
        return `${_action}:${pool}:${basisPoints}::${THORCHAIN_AFFILIATE_NAME}:0`
      }

      throw new Error(`invalid pool in memo: ${memo}`)
    }
    // LOAN+:ASSET:DESTADDR:MINOUT:AFFILIATE:FEE
    case '$+':
    case 'loan+': {
      const [_action, asset, destAddr, minOut, , fee] = memo.split(':')

      assertMemoHasAsset(asset, memo)
      assertMemoHasDestAddr(destAddr, memo)
      // assertIsValidMinOut(minOut, memo) // Disabling until we validate further, as :MINOUT is optional in the quote response

      return `${_action}:${asset}:${destAddr}:${minOut ?? ''}:${THORCHAIN_AFFILIATE_NAME}:${
        fee || 0
      }`
    }
    // LOAN-:ASSET:DESTADDR:MINOUT
    case '$-':
    case 'loan-': {
      const [_action, asset, destAddr, minOut] = memo.split(':')

      assertMemoHasAsset(asset, memo)
      assertMemoHasDestAddr(destAddr, memo)
      // assertIsValidMinOut(minOut, memo) // Disabling until we validate further, as :MINOUT is optional in the quote response

      return `${_action}:${asset}:${destAddr}:${minOut ?? ''}:${THORCHAIN_AFFILIATE_NAME}:0`
    }
    default:
      throw new Error(`unsupported memo: ${memo}`)
  }
}
