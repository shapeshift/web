import { bchChainId, dogeChainId, ethChainId } from '@shapeshiftoss/caip'
import { describe, expect, it } from 'vitest'

import {
  addAggregatorAndDestinationToMemo,
  thorchainParserToBaseUnit,
} from './addAggregatorAndDestinationToMemo'
import { MEMO_PART_DELIMITER } from './constants'

const RECEIVE_ADDRESS = '0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6'
const AGGREGATOR_ADDRESS = '0xd31f7e39afECEc4855fecc51b693F9A0Cec49fd2'
const FINAL_ASSET_ADDRESS = '0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741'
const AGGREGATOR_TWO_LAST_CHARS = 'd2'
const FINAL_ASSET_TWO_LAST_CHARS = '41'

describe('addAggregatorAndDestinationToMemo', () => {
  describe('EVM chains', () => {
    it('should add aggregator address, destination address and minAmountOut correctly', () => {
      // args/original memo
      const minAmountOut = '123456789123456789'
      const affiliateBps = '0'
      const slippageBps = 0

      // memo/output
      const expectedL1AmountOut = '42' // we don't care about this for the purpose of tests
      const memoMinAmountOutCryptoBaseUnit = minAmountOut // no affliateBps nor slippage
      const memoMinAmoutOutThorchainParserNotation = '12345678912345678901'
      const quotedMemo = `=:ETH.ETH:${RECEIVE_ADDRESS}:${expectedL1AmountOut}:ss:${affiliateBps}:${AGGREGATOR_ADDRESS}:${FINAL_ASSET_ADDRESS}:${memoMinAmoutOutThorchainParserNotation}`

      const modifiedMemo = addAggregatorAndDestinationToMemo({
        quotedMemo,
        aggregator: AGGREGATOR_ADDRESS,
        finalAssetAddress: FINAL_ASSET_ADDRESS,
        minAmountOut,
        slippageBps,
        finalAssetPrecision: 9,
        sellAssetChainId: ethChainId,
      })

      const [, , , , , , , , memoMinLimit] = modifiedMemo.split(MEMO_PART_DELIMITER)

      expect(thorchainParserToBaseUnit(memoMinLimit)).toBe(memoMinAmountOutCryptoBaseUnit)

      expect(modifiedMemo).toBe(
        `=${MEMO_PART_DELIMITER}e${MEMO_PART_DELIMITER}${RECEIVE_ADDRESS}${MEMO_PART_DELIMITER}${expectedL1AmountOut}${MEMO_PART_DELIMITER}ss${MEMO_PART_DELIMITER}${affiliateBps}${MEMO_PART_DELIMITER}${AGGREGATOR_TWO_LAST_CHARS}${MEMO_PART_DELIMITER}${FINAL_ASSET_TWO_LAST_CHARS}${MEMO_PART_DELIMITER}${memoMinAmoutOutThorchainParserNotation}`,
      )
    })
    it('should add aggregator address, destination address and minAmountOut correctly with a bigger precision', () => {
      // args/original memo
      const affiliateBps = '100'
      const expectedL1AmountOut = '42' // we don't care about this for the purpose of tests
      const minAmountOut = '2083854765519275828179229'
      const slippageBps = 100 // 1%
      const quotedMemo = `=:ETH.ETH:${RECEIVE_ADDRESS}:${expectedL1AmountOut}:ss:${affiliateBps}:${AGGREGATOR_ADDRESS}:${FINAL_ASSET_ADDRESS}:10`

      const finalExpectedAmountOutThorchainParserNotation = '206301621786408306989743601'
      const finalExpectedAmountOutCryptoBaseUnit = '2063016217864083069897436'

      const modifiedMemo = addAggregatorAndDestinationToMemo({
        quotedMemo,
        aggregator: AGGREGATOR_ADDRESS,
        finalAssetAddress: FINAL_ASSET_ADDRESS,
        minAmountOut,
        slippageBps,
        finalAssetPrecision: 18,
        sellAssetChainId: ethChainId,
      })

      const [, , , , , , , , memoMinLimit] = modifiedMemo.split(MEMO_PART_DELIMITER)

      expect(thorchainParserToBaseUnit(memoMinLimit)).toBe(finalExpectedAmountOutCryptoBaseUnit)

      expect(modifiedMemo).toBe(
        `=${MEMO_PART_DELIMITER}e${MEMO_PART_DELIMITER}${RECEIVE_ADDRESS}${MEMO_PART_DELIMITER}${expectedL1AmountOut}${MEMO_PART_DELIMITER}ss${MEMO_PART_DELIMITER}${slippageBps}${MEMO_PART_DELIMITER}${AGGREGATOR_TWO_LAST_CHARS}${MEMO_PART_DELIMITER}${FINAL_ASSET_TWO_LAST_CHARS}${MEMO_PART_DELIMITER}${finalExpectedAmountOutThorchainParserNotation}`,
      )
    })
    it('should not trim precision', () => {
      // args/original memo
      const affiliateBps = '0'
      const minAmountOut = '612805568043919710616999'
      const expectedL1AmountOut = '42' // we don't care about this for the purpose of tests
      const slippageBps = 100 // 1%

      // memo/output
      const memoMinAmountOutCryptoBaseUnit = '606677512363480513510829'
      const memoMinAmoutOutThorchainParserNotation = '60667751236348051351082901'
      const quotedMemo = `=:ETH.ETH:${RECEIVE_ADDRESS}:${expectedL1AmountOut}:ss:${affiliateBps}:${AGGREGATOR_ADDRESS}:${FINAL_ASSET_ADDRESS}:10`

      const modifiedMemo = addAggregatorAndDestinationToMemo({
        quotedMemo,
        aggregator: AGGREGATOR_ADDRESS,
        finalAssetAddress: FINAL_ASSET_ADDRESS,
        minAmountOut,
        slippageBps,
        finalAssetPrecision: 18,
        sellAssetChainId: ethChainId,
      })

      const [, , , , , , , , memoMinLimit] = modifiedMemo.split(MEMO_PART_DELIMITER)

      expect(thorchainParserToBaseUnit(memoMinLimit)).toBe(memoMinAmountOutCryptoBaseUnit)

      expect(modifiedMemo).toBe(
        `=${MEMO_PART_DELIMITER}e${MEMO_PART_DELIMITER}${RECEIVE_ADDRESS}${MEMO_PART_DELIMITER}${expectedL1AmountOut}${MEMO_PART_DELIMITER}ss${MEMO_PART_DELIMITER}${affiliateBps}${MEMO_PART_DELIMITER}${AGGREGATOR_TWO_LAST_CHARS}${MEMO_PART_DELIMITER}${FINAL_ASSET_TWO_LAST_CHARS}${MEMO_PART_DELIMITER}${memoMinAmoutOutThorchainParserNotation}`,
      )
    })
  })
  describe('220 bytes limit UTXOs chains', () => {
    it('should not drop precision when under 220 bytes', () => {
      // args/original memo
      const minAmountOut = '190583419515297419708605877'
      const slippageBps = 100 // 1%
      const expectedL1AmountOut = '42' // we don't care about this for the purpose of tests
      const affiliateBps = '0' // No affiliate basis points applied

      // Memo/output
      const quotedMemo = `=:BCH.BCH:${RECEIVE_ADDRESS}:${expectedL1AmountOut}:ss:${affiliateBps}:${AGGREGATOR_ADDRESS}:${FINAL_ASSET_ADDRESS}:10`
      const memoMinAmountOutCryptoBaseUnit = '188677585320144445511519818'
      const memoMinAmountOutThorchainParserNotation = '18867758532014444551151981801'

      // Memo after processing
      const modifiedMemo = addAggregatorAndDestinationToMemo({
        quotedMemo,
        aggregator: AGGREGATOR_ADDRESS,
        finalAssetAddress: FINAL_ASSET_ADDRESS,
        minAmountOut,
        slippageBps,
        finalAssetPrecision: 18,
        sellAssetChainId: bchChainId,
      })

      const [, , , , , , , , memoMinAmountOut] = modifiedMemo.split(MEMO_PART_DELIMITER)
      expect(thorchainParserToBaseUnit(memoMinAmountOut)).toBe(memoMinAmountOutCryptoBaseUnit)

      // Ensure the memo does not exceed 220 bytes for BCH
      expect(new Blob([modifiedMemo]).size).toBeLessThanOrEqual(220)

      expect(modifiedMemo).toBe(
        `=${MEMO_PART_DELIMITER}c${MEMO_PART_DELIMITER}${RECEIVE_ADDRESS}${MEMO_PART_DELIMITER}${expectedL1AmountOut}${MEMO_PART_DELIMITER}ss${MEMO_PART_DELIMITER}${affiliateBps}${MEMO_PART_DELIMITER}${AGGREGATOR_TWO_LAST_CHARS}${MEMO_PART_DELIMITER}${FINAL_ASSET_TWO_LAST_CHARS}${MEMO_PART_DELIMITER}${memoMinAmountOutThorchainParserNotation}`,
      )
    })
  })

  describe('80 bytes limit UTXOs chains', () => {
    it('should not throw and correctly add an exponent when needed for DOGE', () => {
      // args/original memo
      const minAmountOut = '190583419515297419708605877'
      const slippageBps = 100 // 1%
      const expectedL1AmountOut = '42' // we don't care about this for the purpose of tests
      const affiliateBps = '0'

      // Memo/output
      const quotedMemo = `=:DOGE.DOGE:${RECEIVE_ADDRESS}:${expectedL1AmountOut}:ss:${affiliateBps}:${AGGREGATOR_ADDRESS}:${FINAL_ASSET_ADDRESS}:10`

      // i.e with loss of precision, 9 decimals of precision lost but we still have 9 after the .
      const memoMinAmountOutCryptoBaseUnit = '188677585320144440000000000'
      const memoMinAmoutOutThorchainParserNotation = '1886775853201444410'

      const modifiedMemo = addAggregatorAndDestinationToMemo({
        quotedMemo,
        aggregator: AGGREGATOR_ADDRESS,
        finalAssetAddress: FINAL_ASSET_ADDRESS,
        minAmountOut,
        slippageBps,
        finalAssetPrecision: 18,
        sellAssetChainId: dogeChainId,
      })

      const [, , , , , , , , memoMinAmountOut] = modifiedMemo.split(MEMO_PART_DELIMITER)
      expect(thorchainParserToBaseUnit(memoMinAmountOut)).toBe(memoMinAmountOutCryptoBaseUnit)

      // Ensure the memo doesn't exceed 80 bytes for DOGE/BTC/LTC
      expect(new Blob([modifiedMemo]).size).toBeLessThanOrEqual(80)

      expect(modifiedMemo).toBe(
        `=${MEMO_PART_DELIMITER}d${MEMO_PART_DELIMITER}${RECEIVE_ADDRESS}${MEMO_PART_DELIMITER}${expectedL1AmountOut}${MEMO_PART_DELIMITER}ss${MEMO_PART_DELIMITER}${affiliateBps}${MEMO_PART_DELIMITER}${AGGREGATOR_TWO_LAST_CHARS}${MEMO_PART_DELIMITER}${FINAL_ASSET_TWO_LAST_CHARS}${MEMO_PART_DELIMITER}${memoMinAmoutOutThorchainParserNotation}`,
      )
    })
    it('should not lose precision if under 80 bytes', () => {
      // args/original memo
      const minAmountOut = '1905'
      const slippageBps = 100 // 1%
      const expectedL1AmountOut = '42' // we don't care about this for the purpose of tests
      const affiliateBps = '0'

      // Memo/output
      const quotedMemo = `=:DOGE.DOGE:${RECEIVE_ADDRESS}:${expectedL1AmountOut}:ss:${affiliateBps}:${AGGREGATOR_ADDRESS}:${FINAL_ASSET_ADDRESS}:10`

      const memoMinAmountOutCryptoBaseUnit = '1885'
      const memoMinAmoutOutThorchainParserNotation = '188501'

      const modifiedMemo = addAggregatorAndDestinationToMemo({
        quotedMemo,
        aggregator: AGGREGATOR_ADDRESS,
        finalAssetAddress: FINAL_ASSET_ADDRESS,
        minAmountOut,
        slippageBps,
        finalAssetPrecision: 18,
        sellAssetChainId: dogeChainId,
      })

      const [, , , , , , , , memoMinAmountOut] = modifiedMemo.split(MEMO_PART_DELIMITER)
      expect(thorchainParserToBaseUnit(memoMinAmountOut)).toBe(memoMinAmountOutCryptoBaseUnit)

      // Ensure the memo is still under 80 bytes (you never know)
      expect(new Blob([modifiedMemo]).size).toBeLessThanOrEqual(80)

      expect(modifiedMemo).toBe(
        `=${MEMO_PART_DELIMITER}d${MEMO_PART_DELIMITER}${RECEIVE_ADDRESS}${MEMO_PART_DELIMITER}${expectedL1AmountOut}${MEMO_PART_DELIMITER}ss${MEMO_PART_DELIMITER}${affiliateBps}${MEMO_PART_DELIMITER}${AGGREGATOR_TWO_LAST_CHARS}${MEMO_PART_DELIMITER}${FINAL_ASSET_TWO_LAST_CHARS}${MEMO_PART_DELIMITER}${memoMinAmoutOutThorchainParserNotation}`,
      )
    })
  })
})
