import {
  btcAssetId,
  btcChainId,
  ethAssetId,
  ethChainId,
  thorchainAssetId,
  thorchainChainId,
} from '@shapeshiftoss/caip'
import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import Web3 from 'web3'

import { DEFAULT_SLIPPAGE } from '../../../utils/constants'
import { BTC, ETH, FOX, RUNE } from '../../../utils/test-data/assets'
import { ThorchainSwapperDeps } from '../../types'
import { getInboundAddressDataForChain } from '../getInboundAddressDataForChain'
import { getTradeRate } from '../getTradeRate/getTradeRate'
import { getUsdRate } from '../getUsdRate/getUsdRate'
import { mockInboundAddresses } from '../test-data/responses'
import { getLimit, GetLimitArgs } from './getLimit'

jest.mock('../getUsdRate/getUsdRate')
jest.mock('../getTradeRate/getTradeRate')
jest.mock('../getInboundAddressDataForChain')

const thorchainSwapperDeps: ThorchainSwapperDeps = {
  midgardUrl: '',
  daemonUrl: '',
  adapterManager: new Map([
    [thorchainChainId, { getFeeAssetId: () => thorchainAssetId }],
    [ethChainId, { getFeeAssetId: () => ethAssetId }],
    [btcChainId, { getFeeAssetId: () => btcAssetId }],
  ]) as ChainAdapterManager,
  web3: <Web3>{},
}

describe('getLimit', () => {
  it('should get limit when buy asset is EVM fee asset and sell asset is a UTXO', async () => {
    ;(getUsdRate as jest.Mock<unknown>)
      .mockReturnValueOnce(Promise.resolve('1595')) // sellFeeAssetUsdRate (ETH)
      .mockReturnValueOnce(Promise.resolve('20683')) // buyAssetUsdRate (BTC)
    ;(getTradeRate as jest.Mock<unknown>).mockReturnValue(Promise.resolve('0.07714399680893498205'))
    ;(getInboundAddressDataForChain as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(mockInboundAddresses.find((address) => address.chain === 'ETH')),
    )
    const getLimitArgs: GetLimitArgs = {
      sellAsset: ETH,
      buyAssetId: BTC.assetId,
      sellAmountCryptoPrecision: '82535000000000000',
      deps: thorchainSwapperDeps,
      slippageTolerance: DEFAULT_SLIPPAGE,
      buyAssetTradeFeeUsd: '6.2049517907881932',
    }
    const limit = await getLimit(getLimitArgs)
    expect(limit).toBe('574407')
  })

  it('should get limit when buy asset is EVM non-fee asset and sell asset is a UTXO', async () => {
    ;(getUsdRate as jest.Mock<unknown>)
      .mockReturnValueOnce(Promise.resolve('1595')) // sellFeeAssetUsdRate (ETH)
      .mockReturnValueOnce(Promise.resolve('20683')) // buyAssetUsdRate (BTC)
    ;(getTradeRate as jest.Mock<unknown>).mockReturnValue(Promise.resolve('0.00000199048641810579'))
    ;(getInboundAddressDataForChain as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(mockInboundAddresses.find((address) => address.chain === 'ETH')),
    )
    const getLimitArgs: GetLimitArgs = {
      sellAsset: FOX,
      buyAssetId: BTC.assetId,
      sellAmountCryptoPrecision: '489830019000000000000',
      deps: thorchainSwapperDeps,
      slippageTolerance: DEFAULT_SLIPPAGE,
      buyAssetTradeFeeUsd: '6.2049517907881932',
    }
    const limit = await getLimit(getLimitArgs)
    expect(limit).toBe('56613')
  })

  it('should get limit when buy asset is RUNE and sell asset is not', async () => {
    ;(getUsdRate as jest.Mock<unknown>)
      .mockReturnValueOnce(Promise.resolve('1595')) // sellFeeAssetUsdRate (ETH)
      .mockReturnValueOnce(Promise.resolve('14.51')) // buyAssetUsdRate (RUNE)
    ;(getTradeRate as jest.Mock<unknown>).mockReturnValue(Promise.resolve('0.02583433052665346349'))
    ;(getInboundAddressDataForChain as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(mockInboundAddresses.find((address) => address.chain === 'ETH')),
    )
    const getLimitArgs: GetLimitArgs = {
      sellAsset: FOX,
      buyAssetId: RUNE.assetId,
      sellAmountCryptoPrecision: '984229076000000000000',
      deps: thorchainSwapperDeps,
      slippageTolerance: DEFAULT_SLIPPAGE,
      buyAssetTradeFeeUsd: '0.0318228582',
    }
    const limit = await getLimit(getLimitArgs)
    expect(limit).toBe('2388981500')
  })

  it('should get limit when sell asset is RUNE and buy asset is not', async () => {
    ;(getUsdRate as jest.Mock<unknown>)
      .mockReturnValueOnce(Promise.resolve('14.51')) // sellFeeAssetUsdRate (RUNE)
      .mockReturnValueOnce(Promise.resolve('0.04')) // buyAssetUsdRate (FOX)
    ;(getTradeRate as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve('38.68447363336979738738'),
    )
    ;(getInboundAddressDataForChain as jest.Mock<unknown>).mockReturnValue(
      Promise.resolve(undefined),
    )
    const getLimitArgs: GetLimitArgs = {
      sellAsset: RUNE,
      buyAssetId: FOX.assetId,
      sellAmountCryptoPrecision: '988381400',
      deps: thorchainSwapperDeps,
      slippageTolerance: DEFAULT_SLIPPAGE,
      buyAssetTradeFeeUsd: '0.0000000026',
    }
    const limit = await getLimit(getLimitArgs)
    expect(limit).toBe('35991584136')
  })
})
