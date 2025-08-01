import { bn } from '@shapeshiftoss/utils'

function assertMemoHasPool(pool: string | undefined, memo: string): asserts pool is string {
  if (!pool) throw new Error(`pool is required in memo: ${memo}`)
}

function assertMemoHasAsset(asset: string | undefined, memo: string): asserts asset is string {
  if (!asset) throw new Error(`asset is required in memo: ${memo}`)
}

function assertMemoHasDestAddr(
  destAddr: string | undefined,
  memo: string,
): asserts destAddr is string {
  if (!destAddr) throw new Error(`destination address is required in memo: ${memo}`)
}

function assertMemoHasAggregatorAddress(
  aggregatorAddr: string | undefined,
  memo: string,
): asserts aggregatorAddr is string {
  if (!aggregatorAddr) throw new Error(`aggregator address is required in memo: ${memo}`)
}

function assertMemoHasFinalAssetContractAddress(
  finalAssetContractAddress: string | undefined,
  memo: string,
): asserts finalAssetContractAddress is string {
  if (!finalAssetContractAddress)
    throw new Error(`final asset contract address is required in memo: ${memo}`)
}

function assertMemoHasPairedAddr(
  pairedAddr: string | undefined,
  memo: string,
): asserts pairedAddr is string {
  if (!pairedAddr) throw new Error(`paired address is required in memo: ${memo}`)
}

function assertMemoHasLimit(limit: string | undefined, memo: string): asserts limit is string {
  if (!limit) throw new Error(`limit is required in memo: ${memo}`)
}

function assertMemoHasFinalAssetLimit(
  finalAssetLimit: string | undefined,
  memo: string,
): asserts finalAssetLimit is string {
  if (!finalAssetLimit) throw new Error(`final asset limit is required in memo: ${memo}`)
}

function assertMemoHasBasisPoints(
  basisPoints: string | undefined,
  memo: string,
): asserts basisPoints is string {
  if (!basisPoints) throw new Error(`basis points is required in memo: ${memo}`)
}

function assertMemoHasAction(action: string | undefined, memo: string): asserts action is string {
  if (!action) throw new Error(`action is required in memo: ${memo}`)
}

const assertIsValidLimit = (limit: string | undefined, memo: string) => {
  assertMemoHasLimit(limit, memo)

  const parts = limit.split('/')
  const [lim, interval, quantity] = parts

  if (parts.length > 1) {
    if (!(lim && interval && quantity && parts.length === 3))
      throw new Error(`invalid streaming parameters in memo: ${memo}`)
    if (!bn(lim).gte(0)) throw new Error(`limit must be >= 0 in memo: ${memo}`)
    if (!bn(interval).gte(0)) throw new Error(`interval must be >= 0 in memo: ${memo}`)
    if (!bn(quantity).gte(0)) throw new Error(`quantity must be >= 0 in memo: ${memo}`)
  } else {
    if (!bn(limit).gt(0)) throw new Error(`positive limit is required in memo: ${memo}`)
  }
}

const assertIsValidFinalAssetLimit = (finalAssetLimit: string | undefined, memo: string) => {
  assertMemoHasFinalAssetLimit(finalAssetLimit, memo)

  if (!bn(finalAssetLimit).gt(0))
    throw new Error(`positive final asset limit is required in memo: ${memo}`)
  if (finalAssetLimit.length < 3)
    throw new Error(`positive final asset limit length should be at least 3 in memo: ${memo}`)
  if (finalAssetLimit.length > 19)
    throw new Error(`positive final asset limit length should be maximum 19 in memo: ${memo}`)
}

function assertIsValidBasisPoints(
  basisPoints: string | undefined,
  memo: string,
): asserts basisPoints is string {
  assertMemoHasBasisPoints(basisPoints, memo)

  if (!bn(basisPoints).isInteger())
    throw new Error(`basis points must be an integer in memo: ${memo}`)
  if (bn(basisPoints).lt(0) || bn(basisPoints).gt(10000))
    throw new Error(`basis points must be between 0-10000 in memo: ${memo}`)
}

/**
 * asserts memo is valid and processes the memo to ensure our affiliate code is always present
 */
export const assertAndProcessMemo = (memo: string, affiliate: string): string => {
  const [action] = memo.split(':')

  assertMemoHasAction(action, memo)

  switch (action.toLowerCase()) {
    case 'swap':
    case '=':
    case 's': {
      // SWAP:ASSET:DESTADDR:LIM/INTERVAL/QUANTITY:AFFILIATE:FEE
      const [
        _action,
        asset,
        destAddr,
        limit,
        ,
        fee,
        aggregatorAddress,
        finalAssetAddress,
        finalAssetAmountOut,
      ] = memo.split(':')

      assertMemoHasAsset(asset, memo)
      assertMemoHasDestAddr(destAddr, memo)
      assertIsValidLimit(limit, memo)

      // SWAP:ASSET:DESTADDR:LIM:AFFILIATE:FEE:DEXAggregatorAddr:FinalTokenAddr:MinAmountOut|
      const maybeSwapOutParts = (() => {
        if (aggregatorAddress || finalAssetAddress || finalAssetAmountOut) {
          assertMemoHasAggregatorAddress(aggregatorAddress, memo)
          assertMemoHasFinalAssetContractAddress(finalAssetAddress, memo)
          assertIsValidFinalAssetLimit(finalAssetAmountOut, memo)

          return `:${aggregatorAddress}:${finalAssetAddress}:${finalAssetAmountOut}`
        }

        return ''
      })()

      return `${_action}:${asset}:${destAddr}:${limit}:${affiliate}:${fee || 0}${maybeSwapOutParts}`
    }
    case 'add':
    case '+':
    case 'a': {
      const [_action, pool, maybePairedAddr, , fee] = memo.split(':')

      assertMemoHasPool(pool, memo)

      // Add Liquidity - ADD:POOL:PAIREDADDR:AFFILIATE:FEE
      if (pool.includes('.')) {
        if (maybePairedAddr) assertMemoHasPairedAddr(maybePairedAddr, memo)
        return `${_action}:${pool}:${maybePairedAddr ?? ''}:${affiliate}:${fee || 0}`
      }

      // Deposit Savers - ADD:POOL::AFFILIATE:FEE
      if (pool.includes('/')) {
        if (maybePairedAddr) throw new Error('paired address is not supported for saver deposit')
        return `${_action}:${pool}::${affiliate}:${fee || 0}`
      }

      throw new Error(`invalid pool in memo: ${memo}`)
    }
    case 'withdraw':
    case '-':
    case 'wd': {
      const [_action, pool, basisPoints, maybeAsset] = memo.split(':')

      assertMemoHasPool(pool, memo)
      assertMemoHasBasisPoints(basisPoints, memo)

      // Withdraw Liquidity - WITHDRAW:POOL:BASISPOINTS:ASSET
      if (pool.includes('.')) {
        if (maybeAsset) assertMemoHasAsset(maybeAsset, memo)
        assertIsValidBasisPoints(basisPoints, memo)
        return `${_action}:${pool}:${basisPoints}:${maybeAsset ?? ''}:${affiliate}:0`
      }

      // Withdraw Savers - WITHDRAW:POOL:BASISPOINTS
      if (pool.includes('/')) {
        if (maybeAsset) throw new Error('asset is not supported for savers withdraw')
        assertIsValidBasisPoints(basisPoints, memo)
        return `${_action}:${pool}:${basisPoints}::${affiliate}:0`
      }

      throw new Error(`invalid pool in memo: ${memo}`)
    }
    // LOAN+:ASSET:DESTADDR:MINOUT:AFFILIATE:FEE
    case '$+':
    case 'loan+': {
      const [_action, asset, destAddr, minOut, , fee] = memo.split(':')

      assertMemoHasAsset(asset, memo)
      assertMemoHasDestAddr(destAddr, memo)

      return `${_action}:${asset}:${destAddr}:${minOut ?? ''}:${affiliate}:${fee || 0}`
    }
    // LOAN-:ASSET:DESTADDR:MINOUT
    case '$-':
    case 'loan-': {
      const [_action, asset, destAddr, minOut] = memo.split(':')

      assertMemoHasAsset(asset, memo)
      assertMemoHasDestAddr(destAddr, memo)

      return `${_action}:${asset}:${destAddr}:${minOut ?? ''}:${affiliate}:0`
    }
    case 'pool+': {
      return memo
    }
    case 'pool-': {
      // RUNEPOOL:BASISPOINTS
      const [_action, basisPoints] = memo.split(':')

      assertIsValidBasisPoints(basisPoints, memo)

      return `${_action}:${basisPoints}:${affiliate}:0`
    }
    case 'tcy': {
      // TCY:CLAIMADDR
      const [_action, destAddr] = memo.split(':')

      assertMemoHasDestAddr(destAddr, memo)

      // Ensures we strip any additional bits which may not be supported for claim Txs
      return `${_action}:${destAddr}`
    }
    case 'tcy+': {
      // TCY+:STAKEADDR
      const [_action] = memo.split(':')

      // Ensures we strip any additional bits - a tcy+ Tx only contains tcy+, nothing else
      return _action
    }
    case 'tcy-': {
      // TCY-:UNSTAKEADDR
      const [_action, basisPoints] = memo.split(':')

      assertIsValidBasisPoints(basisPoints, memo)

      // Ensures we strip any additional bits which may not be supported for unstake Txs
      return `${_action}:${basisPoints}`
    }
    default:
      throw new Error(`unsupported memo: ${memo}`)
  }
}
