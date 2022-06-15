import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { SwapperManager } from '@shapeshiftoss/swapper'
import { KnownChainIds } from '@shapeshiftoss/types'
import { act, renderHook } from '@testing-library/react-hooks'
import debounce from 'lodash/debounce'
import { useFormContext, useWatch } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { ETH, ETHCHAIN_QUOTE, ETHCHAIN_QUOTE_FEES, FOX, USDC, WETH } from 'test/constants'
import { TestProviders } from 'test/TestProviders'
import { TradeAmountInputField, TradeAsset } from 'components/Trade/types'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'

import { useSwapper } from './useSwapper'

jest.mock('lib/web3-instance')
jest.mock('react-hook-form')
jest.mock('lodash/debounce')
jest.mock('@shapeshiftoss/swapper')
jest.mock('context/PluginProvider/PluginProvider')
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}))

function setup({
  action = TradeAmountInputField.SELL,
  approvalNeededBoolean = false,
  quote = {
    rate: '1.2',
    buyAsset: USDC,
    sellAsset: WETH,
  },
} = {}) {
  const setValue = jest.fn()
  const setError = jest.fn()
  const clearErrors = jest.fn()
  const getBestSwapper = jest.fn()
  const getQuote = jest.fn(() => ETHCHAIN_QUOTE)
  const wallet = {} as HDWallet
  const sellAsset: TradeAsset = {
    amount: '20',
    asset: WETH,
  }
  ;(SwapperManager as jest.Mock<unknown>).mockImplementation(() => ({
    getBestSwapper: () => ({
      getDefaultPair: () => [FOX, WETH],
      getUsdRate: () => '1',
      approvalNeeded: () => ({ approvalNeeded: approvalNeededBoolean }),
      approveInfinite: () => '0x023423093248420937',
      getQuote,
      getTradeQuote: getQuote,
    }),
    addSwapper: jest.fn(),
  }))
  ;(debounce as jest.Mock<unknown>).mockImplementation(fn => fn)
  ;(useWatch as jest.Mock<unknown>).mockImplementation(() => [quote, sellAsset, action])
  ;(useFormContext as jest.Mock<unknown>).mockImplementation(() => ({
    setValue,
    setError,
    getValues: () => ({
      action,
      buyAsset: { amount: '20', asset: USDC },
      sellAsset,
      fiatAmount: '20',
    }),
    clearErrors,
  }))
  const wrapper: React.FC = ({ children }) => <TestProviders>{children}</TestProviders>
  const { result } = renderHook(() => useSwapper(), { wrapper })
  const localMockState = {
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
    ;(useChainAdapters as jest.Mock<unknown>).mockImplementation(
      () =>
        new Map([
          [KnownChainIds.BitcoinMainnet, {}],
          [KnownChainIds.CosmosMainnet, {}],
          [KnownChainIds.EthereumMainnet, {}],
        ]),
    )
  })
  it('approves infinite', async () => {
    const { result, wallet } = setup()
    const txid = await result.current.approveInfinite(wallet)
    expect(txid).toBe('0x023423093248420937')
  })
  it('gets approval needed', async () => {
    const { result, wallet } = setup()
    const approvalNeeded = await result.current.checkApprovalNeeded(wallet)
    expect(approvalNeeded).toBe(false)
  })
  it('returns true when approval is needed', async () => {
    const { result, wallet } = setup({ approvalNeededBoolean: true })

    const approvalNeeded = await result.current.checkApprovalNeeded(wallet)
    expect(approvalNeeded).toBe(true)
  })
  it('gets default pair', () => {
    const { result } = setup()
    const defaultPair = result.current.getDefaultPair()
    expect(defaultPair).toHaveLength(2)
  })
  it('swappermanager initializes with swapper', () => {
    const { result } = setup()
    const swapperManager = result.current.swapperManager
    expect(swapperManager).not.toBeNull()
  })
  it('getQuote gets quote with sellAmount', async () => {
    const { localMockState } = setup()
    ;(useSelector as jest.Mock).mockImplementation(callback => {
      return callback(localMockState)
    })
    const { result, setValue } = setup({ action: TradeAmountInputField.SELL })
    await act(async () => {
      result.current.updateQuote({
        amount: '20',
        sellAsset: WETH,
        buyAsset: USDC,
        feeAsset: ETH,
        action: TradeAmountInputField.SELL,
      })
    })
    expect(setValue).toHaveBeenNthCalledWith(1, 'quote', undefined)
    expect(setValue).toHaveBeenNthCalledWith(2, 'fees', ETHCHAIN_QUOTE_FEES)
    expect(setValue).toHaveBeenNthCalledWith(3, 'quote', ETHCHAIN_QUOTE)
    expect(setValue).toHaveBeenNthCalledWith(4, 'sellAssetFiatRate', '1')
    expect(setValue).toHaveBeenNthCalledWith(5, 'feeAssetFiatRate', '1')
    expect(setValue).toHaveBeenNthCalledWith(6, 'fiatSellAmount', '20.00')
    expect(setValue).toHaveBeenNthCalledWith(7, 'buyAsset.amount', '20')
    expect(setValue).toHaveBeenNthCalledWith(8, 'sellAsset.amount', '20')
  })
  it('getQuote gets quote with buyAmount', async () => {
    const { localMockState } = setup()
    ;(useSelector as jest.Mock).mockImplementation(callback => {
      return callback(localMockState)
    })
    const { result, setValue } = setup({ action: TradeAmountInputField.BUY })
    await act(async () => {
      result.current.updateQuote({
        amount: '20',
        sellAsset: WETH,
        buyAsset: USDC,
        feeAsset: ETH,
        action: TradeAmountInputField.BUY,
      })
    })
    expect(setValue).toHaveBeenNthCalledWith(1, 'quote', undefined)
    expect(setValue).toHaveBeenNthCalledWith(2, 'fees', ETHCHAIN_QUOTE_FEES)
    expect(setValue).toHaveBeenNthCalledWith(3, 'quote', ETHCHAIN_QUOTE)
    expect(setValue).toHaveBeenNthCalledWith(4, 'sellAssetFiatRate', '1')
    expect(setValue).toHaveBeenNthCalledWith(5, 'feeAssetFiatRate', '1')
    expect(setValue).toHaveBeenNthCalledWith(6, 'fiatSellAmount', '20.00')
    expect(setValue).toHaveBeenNthCalledWith(7, 'buyAsset.amount', '20')
    expect(setValue).toHaveBeenNthCalledWith(8, 'sellAsset.amount', '20')
  })
  it('getQuote gets quote with fiatAmount', async () => {
    const { localMockState } = setup()
    ;(useSelector as jest.Mock).mockImplementation(callback => {
      return callback(localMockState)
    })
    const { result, setValue } = setup({ action: TradeAmountInputField.FIAT })
    await act(async () => {
      result.current.updateQuote({
        amount: '20',
        sellAsset: WETH,
        buyAsset: USDC,
        feeAsset: ETH,
        action: TradeAmountInputField.FIAT,
      })
    })

    expect(setValue).toHaveBeenNthCalledWith(1, 'quote', undefined)
    expect(setValue).toHaveBeenNthCalledWith(2, 'fees', ETHCHAIN_QUOTE_FEES)
    expect(setValue).toHaveBeenNthCalledWith(3, 'quote', ETHCHAIN_QUOTE)
    expect(setValue).toHaveBeenNthCalledWith(4, 'sellAssetFiatRate', '1')
    expect(setValue).toHaveBeenNthCalledWith(5, 'feeAssetFiatRate', '1')
    expect(setValue).toHaveBeenNthCalledWith(6, 'fiatSellAmount', '20')
    expect(setValue).toHaveBeenNthCalledWith(7, 'buyAsset.amount', '20')
    expect(setValue).toHaveBeenNthCalledWith(8, 'sellAsset.amount', '20')
  })
  it('reset resets', () => {
    const { result, setValue } = setup()
    const reset = result.current.reset
    reset()
    expect(setValue).toBeCalledWith('buyAsset.amount', '')
    expect(setValue).toBeCalledWith('sellAsset.amount', '')
    expect(setValue).toBeCalledWith('fiatSellAmount', '')
  })
})
