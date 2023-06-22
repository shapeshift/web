import { ethAssetId, foxAssetId, optimismAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import { DAO_TREASURY_ETHEREUM_MAINNET, DAO_TREASURY_OPTIMISM } from 'constants/treasury'

import { bn } from '../../../../bignumber/bignumber'
import {
  getTreasuryAddressForReceiveAsset,
  normalizeAmount,
  normalizeIntegerAmount,
} from './helpers'

describe('utils', () => {
  describe('normalizeAmount', () => {
    it('should return a string number rounded to the 16th decimal place', () => {
      const result = normalizeAmount('586084736227728377283728272309128120398')
      expect(result).toEqual('586084736227728400000000000000000000000')
    })
  })
})

describe('normalizeIntegerAmount', () => {
  it('should return a string number rounded to the 16th decimal place', () => {
    const result = normalizeIntegerAmount('586084736227728377283728272309128120398')
    expect(result).toEqual('586084736227728400000000000000000000000')

    const result2 = normalizeIntegerAmount('586084736227728.3')
    expect(result2).toEqual('586084736227728')
  })

  it('should return a string number rounded to the 16th decimal place with number and bn inputs', () => {
    const result1 = normalizeIntegerAmount(bn('586084736227728377283728272309128120398'))
    expect(result1).toEqual('586084736227728400000000000000000000000')

    const result2 = normalizeIntegerAmount(bn('586084736227728.3'))
    expect(result2).toEqual('586084736227728')

    // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
    const result3 = normalizeIntegerAmount(58608473622772841)
    expect(result3).toEqual('58608473622772840')

    const result4 = normalizeIntegerAmount(586084736227728.3)
    expect(result4).toEqual('586084736227728')
  })
})

describe('getTreasuryAddressForReceiveAsset', () => {
  it('gets the treasury address for an ERC20 asset', () => {
    const treasuryAddress = getTreasuryAddressForReceiveAsset(foxAssetId)
    expect(treasuryAddress).toStrictEqual(DAO_TREASURY_ETHEREUM_MAINNET)
  })

  it('gets the treasury address for ETH asset', () => {
    const treasuryAddress = getTreasuryAddressForReceiveAsset(ethAssetId)
    expect(treasuryAddress).toStrictEqual(DAO_TREASURY_ETHEREUM_MAINNET)
  })

  it('gets the treasury address for Optimism asset', () => {
    const treasuryAddress = getTreasuryAddressForReceiveAsset(optimismAssetId)
    expect(treasuryAddress).toStrictEqual(DAO_TREASURY_OPTIMISM)
  })

  it('throws for unsupported chains', () => {
    expect(() => getTreasuryAddressForReceiveAsset(thorchainAssetId)).toThrow(
      '[getTreasuryAddressForReceiveAsset] - Unsupported chainId',
    )
  })
})
