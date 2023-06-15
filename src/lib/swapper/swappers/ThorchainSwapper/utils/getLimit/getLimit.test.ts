import { Ok } from '@sniptt/monads'
import { mockChainAdapters } from 'test/mocks/portfolio'

import { DEFAULT_SLIPPAGE } from '../../../utils/constants'
import { BTC, ETH, FOX_MAINNET, RUNE } from '../../../utils/test-data/assets'
import { getInboundAddressDataForChain } from '../getInboundAddressDataForChain'
import { getTradeRate, getTradeRateBelowMinimum } from '../getTradeRate/getTradeRate'
import { mockInboundAddresses } from '../test-data/responses'
import type { GetLimitArgs } from './getLimit'
import { getLimit } from './getLimit'

jest.mock('../getTradeRate/getTradeRate')
jest.mock('../getInboundAddressDataForChain')
jest.mock('context/PluginProvider/chainAdapterSingleton', () => ({
  getChainAdapterManager: () => mockChainAdapters,
}))

const mockOk = Ok as jest.MockedFunction<typeof Ok>

describe('getLimit', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('should get limit when sell asset is EVM fee asset and buy asset is a UTXO', async () => {
    ;(getTradeRate as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(mockOk('0.07714399680893498205')),
    )
    ;(getTradeRateBelowMinimum as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(mockOk('42.22')),
    )
    ;(getInboundAddressDataForChain as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(mockOk(mockInboundAddresses.find(address => address.chain === 'ETH'))),
    )
    const getLimitArgs: GetLimitArgs = {
      sellAsset: ETH,
      buyAsset: BTC,
      receiveAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      sellAmountCryptoBaseUnit: '82535000000000000',
      slippageTolerance: DEFAULT_SLIPPAGE,
      protocolFees: {
        [BTC.assetId]: {
          amountCryptoBaseUnit: '30000',
          requiresBalance: false,
          asset: BTC,
        },
      },
      affiliateBps: '0',
      buyAssetUsdRate: '20683', // buyAssetUsdRate (BTC)
      feeAssetUsdRate: '1595', // sellFeeAssetUsdRate (ETH)
    }
    const maybeLimit = await getLimit(getLimitArgs)
    expect(maybeLimit.isOk()).toBe(true)
    expect(maybeLimit.unwrap()).toBe('592064')
  })

  it('should get limit when sell asset is EVM non-fee asset and buy asset is a UTXO', async () => {
    ;(getTradeRate as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(mockOk('0.00000199048641810579')),
    )
    ;(getTradeRateBelowMinimum as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(mockOk('42.22')),
    )
    ;(getInboundAddressDataForChain as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(mockOk(mockInboundAddresses.find(address => address.chain === 'ETH'))),
    )
    const getLimitArgs: GetLimitArgs = {
      sellAsset: FOX_MAINNET,
      buyAsset: BTC,
      receiveAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      sellAmountCryptoBaseUnit: '489830019000000000000',
      slippageTolerance: DEFAULT_SLIPPAGE,
      protocolFees: {
        [BTC.assetId]: {
          amountCryptoBaseUnit: '30000',
          requiresBalance: false,
          asset: BTC,
        },
      },
      affiliateBps: '0',
      buyAssetUsdRate: '20683', // buyAssetUsdRate (BTC)
      feeAssetUsdRate: '1595', // sellFeeAssetUsdRate (ETH)
    }
    const maybeLimit = await getLimit(getLimitArgs)
    expect(maybeLimit.isOk()).toBe(true)
    expect(maybeLimit.unwrap()).toBe('59316')
  })

  it('should get limit when buy asset is RUNE and sell asset is not', async () => {
    ;(getTradeRate as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(mockOk('0.02583433052665346349')),
    )
    ;(getTradeRateBelowMinimum as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(mockOk('42.22')),
    )
    ;(getInboundAddressDataForChain as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(mockOk(mockInboundAddresses.find(address => address.chain === 'ETH'))),
    )
    const getLimitArgs: GetLimitArgs = {
      sellAsset: FOX_MAINNET,
      buyAsset: RUNE,
      receiveAddress: 'thor1234j5yq9qg7xqf0yq9qg7xqf0yq9qg7xqf0yq9q',
      sellAmountCryptoBaseUnit: '984229076000000000000',
      slippageTolerance: DEFAULT_SLIPPAGE,
      protocolFees: {
        [RUNE.assetId]: {
          amountCryptoBaseUnit: '219316',
          requiresBalance: false,
          asset: RUNE,
        },
      },
      affiliateBps: '0',
      buyAssetUsdRate: '14.51', // buyAssetUsdRate (RUNE)
      feeAssetUsdRate: '1595', // sellFeeAssetUsdRate (ETH)
    }
    const maybeLimit = await getLimit(getLimitArgs)
    expect(maybeLimit.isOk()).toBe(true)
    expect(maybeLimit.unwrap()).toBe('2459464890')
  })

  it('should get limit when sell asset is RUNE and buy asset is not', async () => {
    ;(getTradeRate as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(mockOk('38.68447363336979738738')),
    )
    ;(getTradeRateBelowMinimum as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(mockOk('42.22')),
    )
    ;(getInboundAddressDataForChain as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(mockOk(undefined)),
    )
    const getLimitArgs: GetLimitArgs = {
      sellAsset: RUNE,
      buyAsset: FOX_MAINNET,
      receiveAddress: '0xFooBar',
      sellAmountCryptoBaseUnit: '988381400',
      slippageTolerance: DEFAULT_SLIPPAGE,
      protocolFees: {
        [FOX_MAINNET.assetId]: {
          amountCryptoBaseUnit: '65000000000',
          requiresBalance: false,
          asset: FOX_MAINNET,
        },
      },
      affiliateBps: '0',
      buyAssetUsdRate: '0.04', // buyAssetUsdRate (FOX)
      feeAssetUsdRate: '14.51', // sellFeeAssetUsdRate (RUNE)
    }
    const maybeLimit = await getLimit(getLimitArgs)
    if (maybeLimit.isErr()) console.log(maybeLimit.unwrapErr())
    expect(maybeLimit.isOk()).toBe(true)
    expect(maybeLimit.unwrap()).toBe('37051458738')
  })
})
