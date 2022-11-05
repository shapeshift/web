import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { SwapperManager } from '@keepkey/swapper'
import { KnownChainIds } from '@keepkey/types'
import { act, renderHook } from '@testing-library/react'
import debounce from 'lodash/debounce'
import type { PropsWithChildren } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { ETH, ETHCHAIN_QUOTE, ETHCHAIN_QUOTE_FEES, FOX, USDC, WETH } from 'test/constants'
import { TestProviders } from 'test/TestProviders'
import type { TradeAsset } from 'components/Trade/types'
import { TradeAmountInputField } from 'components/Trade/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn } from 'lib/bignumber/bignumber'

import { useSwapper } from './useSwapper'

jest.mock('lib/web3-instance')
jest.mock('react-hook-form')
jest.mock('lodash/debounce')
jest.mock('@keepkey/swapper')
jest.mock('hooks/useWallet/useWallet')
jest.mock('context/PluginProvider/PluginProvider')
jest.mock('context/PluginProvider/chainAdapterSingleton')
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}))

const setValue = jest.fn()
const setError = jest.fn()
const clearErrors = jest.fn()
const getBestSwapper = jest.fn()
const getQuote = () => ETHCHAIN_QUOTE
const approvalNeeded = jest.fn()
const wallet = {} as HDWallet
const sellAssetAccountId = 'eip155:1:0x8a65ac0e23f31979db06ec62af62b132a6df4741'
const selectedCurrencyToUsdRate = bn(1)
const sellTradeAsset: TradeAsset = {
  amount: '20',
  asset: WETH,
}
const buyTradeAsset: TradeAsset = {
  amount: '20',
  asset: USDC,
}
const trade = undefined
const isExactAllowance = true
const [sellAssetFiatRate, buyAssetFiatRate, feeAssetFiatRate] = Array(3).fill('1')

function setup({
  approvalNeededBoolean = false,
  quote = {
    rate: '1.2',
    buyAsset: USDC,
    sellAsset: WETH,
  },
} = {}) {
  approvalNeeded.mockReturnValue({ approvalNeeded: approvalNeededBoolean })
  ;(useWatch as jest.Mock<unknown>).mockImplementation(() => [
    quote,
    sellTradeAsset,
    buyTradeAsset,
    trade,
    sellAssetAccountId,
    isExactAllowance,
    sellAssetFiatRate,
    buyAssetFiatRate,
    feeAssetFiatRate,
  ])
  ;(useFormContext as jest.Mock<unknown>).mockImplementation(() => ({
    setValue,
    setError,
    clearErrors,
  }))
  const wrapper: React.FC<PropsWithChildren> = ({ children }) => (
    <TestProviders>{children}</TestProviders>
  )

  const { result } = renderHook(() => useSwapper(), { wrapper })
  const localMockState = {
    swapperApi: {
      subscriptions: {},
    },
    assets: {
      ids: {
        [ETH.assetId]: ETH,
      },
      byId: {
        [ETH.assetId]: ETH,
      },
    },
    portfolio: {
      assetBalances: {
        byId: {
          [ETH.assetId]: '0',
        },
      },
      accountBalances: {
        byId: {
          [ETH.assetId]: '0',
        },
      },
    },
    accountSpecifiers: {
      accountSpecifiers: [{ 'eip155:1': '0x8a65ac0e23f31979db06ec62af62b132a6df4741' }],
    },
    preferences: {
      featureFlags: {},
    },
  }
  return {
    result,
    wallet,
    setValue,
    setError,
    clearErrors,
    getQuote,
    getBestSwapper,
    localMockState,
  }
}

describe('useSwapper', () => {
  beforeEach(() => {
    ;(SwapperManager as jest.Mock<unknown>).mockImplementation(() => ({
      getBestSwapper: () => ({
        name: '0x',
        getDefaultPair: () => [FOX, WETH],
        getUsdRate: () => '1',
        approvalNeeded,
        approveInfinite: () => '0x023423093248420937',
        approveAmount: () => '0x023423093248420937',
        getQuote,
        getTradeQuote: getQuote,
      }),
      addSwapper: jest.fn(),
      swappers: new Map([['foo', 'bar']]),
    }))
    ;(getChainAdapterManager as jest.Mock<unknown>).mockImplementation(
      () =>
        new Map([
          [KnownChainIds.BitcoinMainnet, {}],
          [KnownChainIds.CosmosMainnet, {}],
          [
            KnownChainIds.EthereumMainnet,
            { getAddress: () => '0x8a65ac0e23f31979db06ec62af62b132a6df4741' },
          ],
        ]),
    )
    ;(useWallet as jest.Mock<unknown>).mockImplementation(() => ({
      state: {
        wallet: {},
      },
    }))
    ;(debounce as jest.Mock<unknown>).mockImplementation(fn => fn)
  })
  it('approves infinite', async () => {
    const { result } = setup()
    await act(async () => {
      const txid = await result.current.approve()
      expect(txid).toBe('0x023423093248420937')
    })
  })
  it('gets approval needed', async () => {
    const { result } = setup()
    await act(async () => {
      const approvalNeeded = await result.current.checkApprovalNeeded()
      expect(approvalNeeded).toBe(false)
    })
  })
  it('returns true when approval is needed', async () => {
    const { result } = setup({ approvalNeededBoolean: true })
    await act(async () => {
      const approvalNeeded = await result.current.checkApprovalNeeded()
      expect(approvalNeeded).toBe(true)
    })
  })
  it('swappermanager initializes with swapper', async () => {
    const { result } = setup()
    await act(async () => {
      const swapperManager = result.current.swapperManager
      expect(swapperManager).not.toBeNull()
    })
  })
  it.skip('getQuote gets quote with sellAmount', async () => {
    const { localMockState } = setup()
    ;(useSelector as jest.Mock).mockImplementation(callback => {
      return callback(localMockState)
    })
    const { result, setValue } = setup()
    await act(async () => {
      await result.current.updateQuote({
        amount: '20',
        sellAsset: WETH,
        buyAsset: USDC,
        action: TradeAmountInputField.SELL_CRYPTO,
        selectedCurrencyToUsdRate,
      })
    })
    expect(setValue).toHaveBeenNthCalledWith(1, 'quoteError', null)
    expect(setValue).toHaveBeenNthCalledWith(2, 'quote', undefined)
    expect(setValue).toHaveBeenNthCalledWith(3, 'fees', ETHCHAIN_QUOTE_FEES)
    expect(setValue).toHaveBeenNthCalledWith(4, 'quote', ETHCHAIN_QUOTE)
    expect(setValue).toHaveBeenNthCalledWith(5, 'fiatSellAmount', '20.00')
    expect(setValue).toHaveBeenNthCalledWith(6, 'buyTradeAsset.amount', '20')
    expect(setValue).toHaveBeenNthCalledWith(7, 'sellTradeAsset.amount', '20')
  })
  it.skip('getQuote gets quote with buyAmount', async () => {
    const { localMockState } = setup()
    ;(useSelector as jest.Mock).mockImplementation(callback => {
      return callback(localMockState)
    })
    const { result, setValue } = setup()
    await act(async () => {
      await result.current.updateQuote({
        amount: '20',
        sellAsset: WETH,
        buyAsset: USDC,
        action: TradeAmountInputField.BUY_CRYPTO,
        selectedCurrencyToUsdRate,
      })
    })
    expect(setValue).toHaveBeenNthCalledWith(1, 'quoteError', null)
    expect(setValue).toHaveBeenNthCalledWith(2, 'quote', undefined)
    expect(setValue).toHaveBeenNthCalledWith(3, 'fees', ETHCHAIN_QUOTE_FEES)
    expect(setValue).toHaveBeenNthCalledWith(4, 'quote', ETHCHAIN_QUOTE)
    expect(setValue).toHaveBeenNthCalledWith(5, 'fiatSellAmount', '20.00')
    expect(setValue).toHaveBeenNthCalledWith(6, 'buyTradeAsset.amount', '20')
    expect(setValue).toHaveBeenNthCalledWith(7, 'sellTradeAsset.amount', '20')
  })
  it.skip('getQuote gets quote with fiatAmount', async () => {
    const { localMockState } = setup()
    ;(useSelector as jest.Mock).mockImplementation(callback => {
      return callback(localMockState)
    })
    const { result, setValue } = setup()
    await act(async () => {
      await result.current.updateQuote({
        amount: '20',
        sellAsset: WETH,
        buyAsset: USDC,
        action: TradeAmountInputField.SELL_FIAT,
        selectedCurrencyToUsdRate,
      })
    })

    expect(setValue).toHaveBeenNthCalledWith(1, 'quoteError', null)
    expect(setValue).toHaveBeenNthCalledWith(2, 'quote', undefined)
    expect(setValue).toHaveBeenNthCalledWith(3, 'fees', ETHCHAIN_QUOTE_FEES)
    expect(setValue).toHaveBeenNthCalledWith(4, 'quote', ETHCHAIN_QUOTE)
    expect(setValue).toHaveBeenNthCalledWith(5, 'fiatSellAmount', '20.00')
    expect(setValue).toHaveBeenNthCalledWith(6, 'buyTradeAsset.amount', '20')
    expect(setValue).toHaveBeenNthCalledWith(7, 'sellTradeAsset.amount', '20')
  })
  it('reset resets', async () => {
    const { result, setValue } = setup()
    await act(async () => {
      const reset = result.current.reset
      reset()
    })
    expect(setValue).toBeCalledWith('buyTradeAsset.amount', '')
    expect(setValue).toBeCalledWith('sellTradeAsset.amount', '')
    expect(setValue).toBeCalledWith('fiatSellAmount', '')
  })
})
