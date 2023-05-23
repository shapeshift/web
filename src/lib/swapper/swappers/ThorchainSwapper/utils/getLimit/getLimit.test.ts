import {
  btcAssetId,
  btcChainId,
  ethAssetId,
  ethChainId,
  thorchainAssetId,
  thorchainChainId,
} from '@shapeshiftoss/caip'
import type { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import { Ok } from '@sniptt/monads'
import type Web3 from 'web3'
import * as selectors from 'state/zustand/swapperStore/amountSelectors'

import { DEFAULT_SLIPPAGE } from '../../../utils/constants'
import { BTC, ETH, FOX, RUNE } from '../../../utils/test-data/assets'
import type { ThorchainSwapperDeps } from '../../types'
import { getInboundAddressDataForChain } from '../getInboundAddressDataForChain'
import { getTradeRate, getTradeRateBelowMinimum } from '../getTradeRate/getTradeRate'
import { mockInboundAddresses } from '../test-data/responses'
import type { GetLimitArgs } from './getLimit'
import { getLimit } from './getLimit'

jest.mock('../getTradeRate/getTradeRate')
jest.mock('../getInboundAddressDataForChain')
const selectBuyAssetUsdRateSpy = jest.spyOn(selectors, 'selectBuyAssetUsdRate')
const selectFeeAssetUsdRateSpy = jest.spyOn(selectors, 'selectFeeAssetUsdRate')
const mockOk = Ok as jest.MockedFunction<typeof Ok>

const thorchainSwapperDeps: ThorchainSwapperDeps = {
  midgardUrl: '',
  daemonUrl: '',
  adapterManager: new Map([
    [thorchainChainId, { getFeeAssetId: () => thorchainAssetId }],
    [ethChainId, { getFeeAssetId: () => ethAssetId }],
    [btcChainId, { getFeeAssetId: () => btcAssetId }],
  ]) as ChainAdapterManager,
  web3: {} as Web3,
}

describe('getLimit', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('should get limit when sell asset is EVM fee asset and buy asset is a UTXO', async () => {
    selectFeeAssetUsdRateSpy.mockReturnValueOnce('1595') // sellFeeAssetUsdRate (ETH)
    selectBuyAssetUsdRateSpy.mockReturnValueOnce('20683') // buyAssetUsdRate (BTC)
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
      deps: thorchainSwapperDeps,
      slippageTolerance: DEFAULT_SLIPPAGE,
      protocolFees: {
        [BTC.assetId]: {
          amountCryptoBaseUnit: '30000',
          requiresBalance: false,
          asset: BTC,
        },
      },
      affiliateBps: '0',
    }
    const maybeLimit = await getLimit(getLimitArgs)
    expect(maybeLimit.isOk()).toBe(true)
    expect(maybeLimit.unwrap()).toBe('592064')
  })

  it('should get limit when sell asset is EVM non-fee asset and buy asset is a UTXO', async () => {
    selectFeeAssetUsdRateSpy.mockReturnValueOnce('1595') // sellFeeAssetUsdRate (ETH)
    selectBuyAssetUsdRateSpy.mockReturnValueOnce('20683') // buyAssetUsdRate (BTC)
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
      sellAsset: FOX,
      buyAsset: BTC,
      receiveAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      sellAmountCryptoBaseUnit: '489830019000000000000',
      deps: thorchainSwapperDeps,
      slippageTolerance: DEFAULT_SLIPPAGE,
      protocolFees: {
        [BTC.assetId]: {
          amountCryptoBaseUnit: '30000',
          requiresBalance: false,
          asset: BTC,
        },
      },
      affiliateBps: '0',
    }
    const maybeLimit = await getLimit(getLimitArgs)
    expect(maybeLimit.isOk()).toBe(true)
    expect(maybeLimit.unwrap()).toBe('59316')
  })

  it('should get limit when buy asset is RUNE and sell asset is not', async () => {
    selectFeeAssetUsdRateSpy.mockReturnValueOnce('1595') // sellFeeAssetUsdRate (ETH)
    selectBuyAssetUsdRateSpy.mockReturnValueOnce('14.51') // buyAssetUsdRate (RUNE)
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
      sellAsset: FOX,
      buyAsset: RUNE,
      receiveAddress: 'thor1234j5yq9qg7xqf0yq9qg7xqf0yq9qg7xqf0yq9q',
      sellAmountCryptoBaseUnit: '984229076000000000000',
      deps: thorchainSwapperDeps,
      slippageTolerance: DEFAULT_SLIPPAGE,
      protocolFees: {
        [RUNE.assetId]: {
          amountCryptoBaseUnit: '219316',
          requiresBalance: false,
          asset: RUNE,
        },
      },
      affiliateBps: '0',
    }
    const maybeLimit = await getLimit(getLimitArgs)
    expect(maybeLimit.isOk()).toBe(true)
    expect(maybeLimit.unwrap()).toBe('2459464890')
  })

  it('should get limit when sell asset is RUNE and buy asset is not', async () => {
    selectFeeAssetUsdRateSpy.mockReturnValueOnce('14.51') // sellFeeAssetUsdRate (RUNE)
    selectBuyAssetUsdRateSpy.mockReturnValueOnce('0.04') // buyAssetUsdRate (FOX)
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
      buyAsset: FOX,
      receiveAddress: '0xFooBar',
      sellAmountCryptoBaseUnit: '988381400',
      deps: thorchainSwapperDeps,
      slippageTolerance: DEFAULT_SLIPPAGE,
      protocolFees: {
        [FOX.assetId]: {
          amountCryptoBaseUnit: '65000000000',
          requiresBalance: false,
          asset: FOX,
        },
      },
      affiliateBps: '0',
    }
    const maybeLimit = await getLimit(getLimitArgs)
    expect(maybeLimit.isOk()).toBe(true)
    expect(maybeLimit.unwrap()).toBe('37051458738')
  })
})
