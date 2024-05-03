import type { ChainId } from '@shapeshiftoss/caip'
import {
  avalancheChainId,
  bchChainId,
  binanceChainId,
  bscChainId,
  btcChainId,
  cosmosChainId,
  dogeChainId,
  ethChainId,
  ltcChainId,
  thorchainChainId,
} from '@shapeshiftoss/caip'
import { chainIdToChainLabel } from '@shapeshiftoss/chain-adapters'
import invert from 'lodash/invert'
import WAValidator from 'multicoin-address-validator'
import { bn } from 'lib/bignumber/bignumber'
import { shortenedNativeAssetNameByNativeAssetName } from 'lib/swapper/swappers/ThorchainSwapper/utils/longTailHelpers'
import { thorPoolIdAssetIdSymbolMap } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'

import {
  LIMIT_PART_DELIMITER,
  MEMO_PART_DELIMITER,
  SYNTH_PART_DELIMITER,
  THORCHAIN_AFFILIATE_NAME,
} from './constants'

const thorShortenedNameToPoolId = invert(shortenedNativeAssetNameByNativeAssetName)

const thorChainToChainId: Map<string, ChainId> = new Map([
  ['ETH', ethChainId],
  ['AVAX', avalancheChainId],
  ['BTC', btcChainId],
  ['BCH', bchChainId],
  ['LTC', ltcChainId],
  ['BNB', binanceChainId],
  ['DOGE', dogeChainId],
  ['GAIA', cosmosChainId],
  ['RUNE', thorchainChainId],
  ['THOR', thorchainChainId],
  ['BSC', bscChainId],
])

const isValidAddress = (poolOrAsset: string, address: string): boolean => {
  const name = thorShortenedNameToPoolId[poolOrAsset] ?? poolOrAsset

  switch (true) {
    case name.startsWith('ETH'):
    case name.startsWith('BSC'):
    case name.startsWith('AVAX'):
    case name.startsWith('BTC'):
    case name.startsWith('BCH'):
    case name.startsWith('LTC'):
    case name.startsWith('BNB'):
    case name.startsWith('DOGE'): {
      const [chain] = name.split(/[./]/)
      const chainId = thorChainToChainId.get(chain)
      if (!chainId) return false
      return WAValidator.validate(address, chainIdToChainLabel(chainId))
    }
    case name.startsWith('GAIA'):
      return address.startsWith('cosmos')
    case name.startsWith('THOR'):
      return address.startsWith('thor')
    default:
      return false
  }
}

export const assertIsValidPool = (pool: string | undefined, memo: string) => {
  if (!pool) throw new Error(`pool is required in memo: ${memo}`)
  // shortcut to validate savers pools until we have a generated list
  const normalizedPool = pool.replace(/\//g, '.')
  if (!thorPoolIdAssetIdSymbolMap[normalizedPool] && !thorShortenedNameToPoolId[normalizedPool])
    throw new Error(`invalid pool in memo: ${memo}`)
  // TODO: abbrevated names
}

const assertIsValidAsset = (asset: string | undefined, memo: string) => {
  if (!asset) throw new Error(`asset is required in memo: ${memo}`)
  if (!thorPoolIdAssetIdSymbolMap[asset] && !thorShortenedNameToPoolId[asset])
    throw new Error(`invalid asset in memo: ${memo}`)
  // TODO: abbrevated names
}

const assertIsValidDestAddr = (destAddr: string | undefined, asset: string, memo: string) => {
  if (!destAddr) throw new Error(`destination address is required in memo: ${memo}`)
  if (!isValidAddress(asset, destAddr))
    throw new Error(`invalid destination address in memo: ${memo}`)
}

const assertIsValidPairedAddr = (pairedAddr: string | undefined, pool: string, memo: string) => {
  if (!pairedAddr) throw new Error(`paired address is required in memo: ${memo}`)
  if (!isValidAddress(pool, pairedAddr)) throw new Error(`invalid paired address in memo: ${memo}`)
}

const assertIsValidLimit = (limit: string | undefined, memo: string) => {
  if (!limit) throw new Error(`limit is required in memo: ${memo}`)

  const maybeStreamingSwap = limit.match(/\//g)
  const [lim, interval, quantity] = limit.split(LIMIT_PART_DELIMITER)

  if (maybeStreamingSwap) {
    if (maybeStreamingSwap.length !== 3)
      throw new Error(`invalid streaming parameters in memo: ${memo}`)
    if (!bn(lim).isInteger()) throw new Error(`limit is a required integer value in memo: ${memo}`)
    if (!bn(interval).isInteger())
      throw new Error(`interval is a required integer value in memo: ${memo}`)
    if (!bn(quantity).isInteger())
      throw new Error(`quantity is a required integer value in memo: ${memo}`)
  }

  if (!bn(limit).isInteger()) throw new Error(`limit is a required integer value in memo: ${memo}`)
  if (!bn(limit).gt(0))
    throw new Error(`limit is required to be greater than zero in memo: ${memo}`)
}

// TODO: enable after minimum out safety is added to thorchain lending
//const assertIsValidMinOut = (minOut: string | undefined, memo: string) => {
//  if (!minOut) throw new Error(`minOut is required in memo: ${memo}`)
//
//  if (!bn(minOut).isInteger())
//    throw new Error(`minimum out is a required integer value in memo: ${memo}`)
//  if (!bn(minOut).gt(0))
//    throw new Error(`minimum out is required to be greater than zero in memo: ${memo}`)
//}

const assertIsValidBasisPoints = (basisPoints: string | undefined, memo: string) => {
  if (!basisPoints) throw new Error(`basis points is required in memo: ${memo}`)
  if (!bn(basisPoints).isInteger())
    throw new Error(`basis points is a required integer value in memo: ${memo}`)
  if (bn(basisPoints).lt(0) || bn(basisPoints).gt(10000))
    throw new Error(`basis points is required to be between 0-10000 in memo: ${memo}`)
}

/**
 * asserts memo is valid and processes the memo to ensure our affiliate code is always present
 */
export const assertAndProcessMemo = (memo: string): string => {
  const [action = ''] = memo.split(MEMO_PART_DELIMITER)

  switch (action.toLowerCase()) {
    case 'swap':
    case '=':
    case 's': {
      // SWAP:ASSET:DESTADDR:LIM/INTERVAL/QUANTITY:AFFILIATE:FEE
      const [_action, asset, destAddr, limit, , fee] = memo.split(MEMO_PART_DELIMITER)

      assertIsValidAsset(asset, memo)
      assertIsValidDestAddr(destAddr, asset, memo)
      assertIsValidLimit(limit, memo)

      return `${_action}:${asset}:${destAddr}:${limit}:${THORCHAIN_AFFILIATE_NAME}:${fee || 0}`
    }
    case 'add':
    case '+':
    case 'a': {
      const [_action, pool, maybePairedAddr = '', , fee] = memo.split(MEMO_PART_DELIMITER)

      assertIsValidPool(pool, memo)

      // Deposit Savers - ADD:POOL::AFFILIATE:FEE
      if (pool.includes(SYNTH_PART_DELIMITER)) {
        if (maybePairedAddr) throw new Error('paired address is not supported for savers deposit')
        return `${_action}:${pool}::${THORCHAIN_AFFILIATE_NAME}:${fee || 0}`
      }

      // Add Liquidity - ADD:POOL:PAIREDADDR:AFFILIATE:FEE
      if (maybePairedAddr) assertIsValidPairedAddr(maybePairedAddr, pool, memo)
      return `${_action}:${pool}:${maybePairedAddr}:${THORCHAIN_AFFILIATE_NAME}:${fee || 0}`
    }
    case 'withdraw':
    case '-':
    case 'wd': {
      const [_action, pool, basisPoints, maybeAsset = ''] = memo.split(MEMO_PART_DELIMITER)

      assertIsValidPool(pool, memo)

      // Withdraw Savers - WITHDRAW:POOL:BASISPOINTS
      if (pool.includes(SYNTH_PART_DELIMITER)) {
        if (maybeAsset) throw new Error('asset is not supported for savers withdraw')
        assertIsValidBasisPoints(basisPoints, memo)
        return `${_action}:${pool}:${basisPoints}::${THORCHAIN_AFFILIATE_NAME}:0`
      }

      // Withdraw Liquidity - WITHDRAW:POOL:BASISPOINTS:ASSET
      if (maybeAsset) assertIsValidAsset(maybeAsset, memo)
      assertIsValidBasisPoints(basisPoints, memo)
      return `${_action}:${pool}:${basisPoints}:${maybeAsset}:${THORCHAIN_AFFILIATE_NAME}:0`
    }
    // LOAN+:ASSET:DESTADDR:MINOUT:AFFILIATE:FEE
    case '$+':
    case 'loan+': {
      const [_action, asset, destAddr, minOut = '', , fee] = memo.split(MEMO_PART_DELIMITER)

      assertIsValidAsset(asset, memo)
      assertIsValidDestAddr(destAddr, asset, memo)
      //assertIsValidMinOut(minOut, memo)

      return `${_action}:${asset}:${destAddr}:${minOut}:${THORCHAIN_AFFILIATE_NAME}:${fee || 0}`
    }
    // LOAN-:ASSET:DESTADDR:MINOUT
    case '$-':
    case 'loan-': {
      const [_action, asset, destAddr, minOut = ''] = memo.split(MEMO_PART_DELIMITER)

      assertIsValidAsset(asset, memo)
      assertIsValidDestAddr(destAddr, asset, memo)
      //assertIsValidMinOut(minOut, memo)

      return `${_action}:${asset}:${destAddr}:${minOut}:${THORCHAIN_AFFILIATE_NAME}:0`
    }
    default:
      throw new Error(`unsupported memo: ${memo}`)
  }
}
