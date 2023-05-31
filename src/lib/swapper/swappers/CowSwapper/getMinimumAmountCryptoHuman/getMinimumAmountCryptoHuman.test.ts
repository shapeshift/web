import { KnownChainIds } from '@shapeshiftoss/types'

import { BTC, ETH, FOX_MAINNET, USDC_GNOSIS, WETH, XDAI } from '../../utils/test-data/assets'
import type { CowChainId } from '../types'
import { getMinimumAmountCryptoHuman } from './getMinimumAmountCryptoHuman'

jest.mock('state/zustand/swapperStore/amountSelectors', () => ({
  ...jest.requireActual('state/zustand/swapperStore/amountSelectors'),
  selectSellAssetUsdRate: jest.fn(() => '0.25'),
}))

const supportedChainIds: CowChainId[] = [KnownChainIds.EthereumMainnet, KnownChainIds.GnosisMainnet]

describe('getMinimumAmountCryptoHuman', () => {
  it('returns minimumAmountCryptoHuman and maximumAmountCryptoHuman', () => {
    const maybeMin = getMinimumAmountCryptoHuman(FOX_MAINNET, WETH, supportedChainIds)
    expect(maybeMin.isErr()).toBe(false)
    const minimumAmountCryptoHuman = maybeMin.unwrap()
    expect(minimumAmountCryptoHuman).toBe('80')
  })

  it('returns minimumAmountCryptoHuman and maximumAmountCryptoHuman for ETH as buy asset', () => {
    const maybeMin = getMinimumAmountCryptoHuman(FOX_MAINNET, WETH, supportedChainIds)
    expect(maybeMin.isErr()).toBe(false)
    const minimumAmountCryptoHuman = maybeMin.unwrap()
    expect(minimumAmountCryptoHuman).toBe('80')
  })

  it('returns minimumAmountCryptoHuman and maximumAmountCryptoHuman for XDAI as buy asset', () => {
    const maybeMin = getMinimumAmountCryptoHuman(USDC_GNOSIS, XDAI, supportedChainIds)
    expect(maybeMin.isErr()).toBe(false)
    const minimumAmountCryptoHuman = maybeMin.unwrap()
    expect(minimumAmountCryptoHuman).toBe('0.04')
  })

  it('fails on native EVM assetId sell assets and buy assets on a chain unsupported by CoW', () => {
    const expectedError = {
      cause: undefined,
      code: 'UNSUPPORTED_PAIR',
      details: undefined,
      message: '[getMinimumAmountCryptoHuman]',
      name: 'SwapError',
    }

    expect(getMinimumAmountCryptoHuman(ETH, WETH, supportedChainIds).unwrapErr()).toMatchObject(
      expectedError,
    )
    expect(
      getMinimumAmountCryptoHuman(FOX_MAINNET, BTC, supportedChainIds).unwrapErr(),
    ).toMatchObject(expectedError)
    expect(
      getMinimumAmountCryptoHuman(XDAI, USDC_GNOSIS, supportedChainIds).unwrapErr(),
    ).toMatchObject(expectedError)
  })
})
