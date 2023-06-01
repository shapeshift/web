import { KnownChainIds } from '@shapeshiftoss/types'

import { BTC, ETH, FOX_MAINNET, USDC_GNOSIS, WETH, XDAI } from '../../utils/test-data/assets'
import type { CowChainId } from '../types'
import { MAX_COWSWAP_TRADE } from '../utils/constants'
import { getCowSwapMinMax } from './getCowSwapMinMax'

jest.mock('state/zustand/swapperStore/amountSelectors', () => ({
  ...jest.requireActual('state/zustand/swapperStore/amountSelectors'),
  selectSellAssetUsdRate: jest.fn(() => '0.25'),
}))

const supportedChainIds: CowChainId[] = [KnownChainIds.EthereumMainnet, KnownChainIds.GnosisMainnet]

describe('getCowSwapMinMax', () => {
  it('returns minimumAmountCryptoHuman and maximumAmountCryptoHuman', () => {
    const maybeMinMax = getCowSwapMinMax(FOX_MAINNET, WETH, supportedChainIds)
    expect(maybeMinMax.isErr()).toBe(false)
    const minMax = maybeMinMax.unwrap()
    expect(minMax.minimumAmountCryptoHuman).toBe('80')
    expect(minMax.maximumAmountCryptoHuman).toBe(MAX_COWSWAP_TRADE)
  })

  it('returns minimumAmountCryptoHuman and maximumAmountCryptoHuman for ETH as buy asset', () => {
    const maybeMinMax = getCowSwapMinMax(FOX_MAINNET, WETH, supportedChainIds)
    expect(maybeMinMax.isErr()).toBe(false)
    const minMax = maybeMinMax.unwrap()
    expect(minMax.minimumAmountCryptoHuman).toBe('80')
    expect(minMax.maximumAmountCryptoHuman).toBe(MAX_COWSWAP_TRADE)
  })

  it('returns minimumAmountCryptoHuman and maximumAmountCryptoHuman for XDAI as buy asset', () => {
    const maybeMinMax = getCowSwapMinMax(USDC_GNOSIS, XDAI, supportedChainIds)
    expect(maybeMinMax.isErr()).toBe(false)
    const minMax = maybeMinMax.unwrap()
    expect(minMax.minimumAmountCryptoHuman).toBe('0.04')
    expect(minMax.maximumAmountCryptoHuman).toBe(MAX_COWSWAP_TRADE)
  })

  it('fails on native EVM assetId sell assets and buy assets on a chain unsupported by CoW', () => {
    const expectedError = {
      cause: undefined,
      code: 'UNSUPPORTED_PAIR',
      details: undefined,
      message: '[getCowSwapMinMax]',
      name: 'SwapError',
    }

    expect(getCowSwapMinMax(ETH, WETH, supportedChainIds).unwrapErr()).toMatchObject(expectedError)
    expect(getCowSwapMinMax(FOX_MAINNET, BTC, supportedChainIds).unwrapErr()).toMatchObject(
      expectedError,
    )
    expect(getCowSwapMinMax(XDAI, USDC_GNOSIS, supportedChainIds).unwrapErr()).toMatchObject(
      expectedError,
    )
  })
})
