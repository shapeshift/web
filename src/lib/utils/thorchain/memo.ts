import { bn } from 'lib/bignumber/bignumber'

import { THORCHAIN_AFFILIATE_NAME } from './constants'

const assertIsValidPool = (pool: string, memo: string) => {
  if (!pool) throw new Error(`pool is required in memo: ${memo}`)
}

const assertIsValidAsset = (asset: string, memo: string) => {
  if (!asset) throw new Error(`asset is required in memo: ${memo}`)
}

const assertIsValidDestAddr = (destAddr: string, memo: string) => {
  if (!destAddr) throw new Error(`destination address is required in memo: ${memo}`)
}

const assertIsValidPairedAddr = (pairedAddr: string, memo: string) => {
  if (!pairedAddr) throw new Error(`paired address is required in memo: ${memo}`)
}

const assertIsValidLimit = (limit: string, memo: string) => {
  const maybeStreamingSwap = limit.match(/\//g)
  const [lim, interval, quantity] = limit.split('/')

  if (maybeStreamingSwap) {
    if (maybeStreamingSwap.length !== 3)
      throw new Error(`invalid streaming parameters in memo: ${memo}`)
    if (!bn(lim).isInteger()) throw new Error(`limit is required in memo: ${memo}`)
    if (!bn(interval).isInteger()) throw new Error(`interval is required in memo: ${memo}`)
    if (!bn(quantity).isInteger()) throw new Error(`quantity is required in memo: ${memo}`)
  }

  if (!bn(limit).isInteger() || !bn(limit).gt(0))
    throw new Error(`limit is required in memo: ${memo}`)
}

const assertIsValidMinOut = (minOut: string, memo: string) => {
  if (!bn(minOut).isInteger() || !bn(minOut).gt(0))
    throw new Error(`minOut is required in memo: ${memo}`)
}

const assertIsValidBasisPoints = (basisPoints: string, memo: string) => {
  if (!bn(basisPoints).isInteger()) throw new Error(`basis points is required in memo: ${memo}`)
  if (bn(basisPoints).lt(0) || bn(basisPoints).gt(10000))
    throw new Error(`basis points must be between 0-10000 in memo: ${memo}`)
}

/**
 * asserts memo is valid and processes the memo to ensure our affiliate code is always present
 */
export const assertAndProcessMemo = (memo: string): string => {
  const [action] = memo.split(':')

  switch (action.toLowerCase()) {
    case 'swap':
    case '=':
    case 's': {
      // SWAP:ASSET:DESTADDR:LIM/INTERVAL/QUANTITY:AFFILIATE:FEE
      const [_action, asset, destAddr, limit, , fee] = memo.split(':')

      assertIsValidAsset(asset, memo)
      assertIsValidDestAddr(destAddr, memo)
      assertIsValidLimit(limit, memo)

      return `${_action}:${asset}:${destAddr}:${limit}:${THORCHAIN_AFFILIATE_NAME}:${fee || 0}`
    }
    case 'add':
    case '+':
    case 'a': {
      const [_action, pool, maybePairedAddr, , fee] = memo.split(':')

      assertIsValidPool(pool, memo)

      // Add Liquidity - ADD:POOL:PAIREDADDR:AFFILIATE:FEE
      if (pool.includes('.')) {
        if (maybePairedAddr) assertIsValidPairedAddr(maybePairedAddr, memo)
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

      assertIsValidPool(pool, memo)

      // Withdraw Liquidity - WITHDRAW:POOL:BASISPOINTS:ASSET
      if (pool.includes('.')) {
        if (maybeAsset) assertIsValidAsset(maybeAsset, memo)
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

      assertIsValidAsset(asset, memo)
      assertIsValidDestAddr(destAddr, memo)
      assertIsValidMinOut(minOut, memo)

      return `${_action}:${asset}:${destAddr}:${minOut}:${THORCHAIN_AFFILIATE_NAME}:${fee || 0}`
    }
    // LOAN-:ASSET:DESTADDR:MINOUT
    case '$-':
    case 'loan-': {
      const [_action, asset, destAddr, minOut] = memo.split(':')

      assertIsValidAsset(asset, memo)
      assertIsValidDestAddr(destAddr, memo)
      assertIsValidMinOut(minOut, memo)

      return `${_action}:${asset}:${destAddr}:${minOut}:${THORCHAIN_AFFILIATE_NAME}:0`
    }
    default:
      throw new Error(`unsupported memo: ${memo}`)
  }
}
