import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { SwapperManager } from '@shapeshiftoss/swapper'
import { act, renderHook } from '@testing-library/react-hooks'
import debounce from 'lodash/debounce'
import { useFormContext, useWatch } from 'react-hook-form'
import { ETH, ETHCHAIN_QUOTE, ETHCHAIN_QUOTE_FEES, FOX, MIN_MAX, USDC, WETH } from 'test/constants'
import { TestProviders } from 'test/TestProviders'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'
import { fromBaseUnit } from 'lib/math'

import { TradeActions, useSwapper } from './useSwapper'

jest.mock('lib/web3-instance')
jest.mock('react-hook-form')
jest.mock('lodash/debounce')
jest.mock('@shapeshiftoss/swapper')
jest.mock('context/PluginProvider/PluginProvider')

function setup({
  action = TradeActions.SELL,
  approvalNeededBoolean = false,
  quote = {
    rate: '1.2',
    buyAsset: USDC,
    sellAsset: WETH,
  },
  minMax = MIN_MAX,
} = {}) {
  const setValue = jest.fn()
  const setError = jest.fn()
  const clearErrors = jest.fn()
  const getBestSwapper = jest.fn()
  const getQuote = jest.fn(() => ETHCHAIN_QUOTE)
  const wallet = {} as HDWallet
  ;(SwapperManager as jest.Mock<unknown>).mockImplementation(() => ({
    getBestSwapper: () => ({
      getDefaultPair: () => [FOX, WETH],
      getMinMax: jest.fn(() => minMax),
      getUsdRate: () => '1',
      approvalNeeded: () => ({ approvalNeeded: approvalNeededBoolean }),
      approveInfinite: () => '0x023423093248420937',
      getQuote,
      getTradeQuote: getQuote,
    }),
    addSwapper: jest.fn(),
  }))
  ;(debounce as jest.Mock<unknown>).mockImplementation(fn => fn)
  ;(useWatch as jest.Mock<unknown>).mockImplementation(() => [quote, {}, action])
  ;(useFormContext as jest.Mock<unknown>).mockImplementation(() => ({
    setValue,
    setError,
    getValues: () => ({
      trade: minMax,
      action,
      buyAsset: { amount: '20', currency: USDC },
      sellAsset: { amount: '20', currency: WETH },
      fiatAmount: '20',
    }),
    clearErrors,
  }))
  const wrapper: React.FC = ({ children }) => <TestProviders>{children}</TestProviders>
  const { result } = renderHook(() => useSwapper(), { wrapper })
  return { result, wallet, setValue, setError, clearErrors, getQuote, getBestSwapper }
}

describe('useSwapper', () => {
  beforeEach(() => {
    ;(useChainAdapters as jest.Mock<unknown>).mockImplementation(() => ({
      byChain: jest.fn(),
      addChain: jest.fn(),
      getSupportedChains: jest.fn(),
    }))
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
    const { result, setValue } = setup({ action: TradeActions.SELL })
    await act(async () => {
      result.current.getQuote({
        amount: '20',
        sellAsset: { currency: WETH },
        buyAsset: { currency: USDC },
        feeAsset: ETH,
        action: TradeActions.SELL,
      })
    })
    const buyAmount = fromBaseUnit(
      ETHCHAIN_QUOTE.buyAmount || '0',
      ETHCHAIN_QUOTE.buyAsset.precision,
    )
    expect(setValue).toHaveBeenNthCalledWith(1, 'fees', ETHCHAIN_QUOTE_FEES)
    expect(setValue).toHaveBeenNthCalledWith(2, 'quote', ETHCHAIN_QUOTE)
    expect(setValue).toHaveBeenNthCalledWith(3, 'sellAsset.fiatRate', '1')
    expect(setValue).toHaveBeenNthCalledWith(4, 'buyAsset.fiatRate', '0.00026046624288885352')
    expect(setValue).toHaveBeenNthCalledWith(5, 'buyAsset.amount', buyAmount)
    expect(setValue).toHaveBeenNthCalledWith(6, 'fiatAmount', '0.00')
    expect(setValue).toHaveBeenNthCalledWith(7, 'action', undefined)
    expect(setValue).toHaveBeenNthCalledWith(8, 'estimatedGasFees', '0.153244')
  })
  it('getQuote gets quote with buyAmount', async () => {
    const { result, setValue } = setup({ action: TradeActions.BUY })
    await act(async () => {
      result.current.getQuote({
        amount: '20',
        sellAsset: { currency: WETH },
        buyAsset: { currency: USDC },
        feeAsset: ETH,
        action: TradeActions.BUY,
      })
    })
    const sellAmount = fromBaseUnit(
      ETHCHAIN_QUOTE.sellAmount || '0',
      ETHCHAIN_QUOTE.sellAsset.precision,
    )
    expect(setValue).toHaveBeenNthCalledWith(1, 'fees', ETHCHAIN_QUOTE_FEES)
    expect(setValue).toHaveBeenNthCalledWith(2, 'quote', ETHCHAIN_QUOTE)
    expect(setValue).toHaveBeenNthCalledWith(3, 'sellAsset.fiatRate', '1')
    expect(setValue).toHaveBeenNthCalledWith(4, 'buyAsset.fiatRate', '0.00026046624288885352')
    expect(setValue).toHaveBeenNthCalledWith(5, 'sellAsset.amount', sellAmount)
    expect(setValue).toHaveBeenNthCalledWith(6, 'fiatAmount', '0.00')
    expect(setValue).toHaveBeenNthCalledWith(7, 'action', undefined)
    expect(setValue).toHaveBeenNthCalledWith(8, 'estimatedGasFees', '0.153244')
  })
  it('getQuote needs buyAsset or sellAsset', async () => {
    const { result, getQuote } = setup({ action: TradeActions.FIAT })
    await act(async () => {
      result.current.getQuote({
        amount: '20',
        //@ts-ignore
        sellAsset: { currency: undefined },
        //@ts-ignore
        buyAsset: { currency: undefined },
      })
    })
    expect(getQuote).not.toHaveBeenCalled()
  })
  it('getQuote gets quote with fiatAmount', async () => {
    const { result, setValue } = setup({ action: TradeActions.FIAT })
    await act(async () => {
      result.current.getQuote({
        amount: '20',
        sellAsset: { currency: WETH },
        buyAsset: { currency: USDC },
        feeAsset: ETH,
        action: TradeActions.FIAT,
      })
    })
    const buyAmount = fromBaseUnit(
      ETHCHAIN_QUOTE.buyAmount || '0',
      ETHCHAIN_QUOTE.buyAsset.precision,
    )
    const sellAmount = fromBaseUnit(
      ETHCHAIN_QUOTE.sellAmount || '0',
      ETHCHAIN_QUOTE.sellAsset.precision,
    )
    expect(setValue).toHaveBeenNthCalledWith(1, 'fees', ETHCHAIN_QUOTE_FEES)
    expect(setValue).toHaveBeenNthCalledWith(2, 'quote', ETHCHAIN_QUOTE)
    expect(setValue).toHaveBeenNthCalledWith(3, 'sellAsset.fiatRate', '1')
    expect(setValue).toHaveBeenNthCalledWith(4, 'buyAsset.fiatRate', '0.00026046624288885352')
    expect(setValue).toHaveBeenNthCalledWith(5, 'buyAsset.amount', buyAmount)
    expect(setValue).toHaveBeenNthCalledWith(6, 'sellAsset.amount', sellAmount)
    expect(setValue).toHaveBeenNthCalledWith(7, 'action', undefined)
    expect(setValue).toHaveBeenNthCalledWith(8, 'estimatedGasFees', '0.153244')
  })
  it('getQuote sets trade value with minMax if no quote is in state', async () => {
    const minMax = { minimum: '1000', minimumAmount: '1' }
    //@ts-ignore
    const { result, setValue } = setup({ quote: null, minMax })
    await act(async () => {
      result.current.getQuote({
        amount: '20',
        sellAsset: { currency: WETH },
        buyAsset: { currency: USDC },
        feeAsset: ETH,
        action: TradeActions.SELL,
      })
    })
    const buyAmount = fromBaseUnit(
      ETHCHAIN_QUOTE.buyAmount || '0',
      ETHCHAIN_QUOTE.buyAsset.precision,
    )
    expect(setValue).toHaveBeenNthCalledWith(1, 'trade', minMax)
    expect(setValue).toHaveBeenNthCalledWith(2, 'fees', ETHCHAIN_QUOTE_FEES)
    expect(setValue).toHaveBeenNthCalledWith(3, 'quote', ETHCHAIN_QUOTE)
    expect(setValue).toHaveBeenNthCalledWith(4, 'sellAsset.fiatRate', '1')
    expect(setValue).toHaveBeenNthCalledWith(5, 'buyAsset.fiatRate', '0.00026046624288885352')
    expect(setValue).toHaveBeenNthCalledWith(6, 'buyAsset.amount', buyAmount)
    expect(setValue).toHaveBeenNthCalledWith(7, 'fiatAmount', '0.00')
  })
  it('reset resets', () => {
    const { result, setValue } = setup()
    const reset = result.current.reset
    reset()
    expect(setValue).toBeCalledWith('buyAsset.amount', '')
    expect(setValue).toBeCalledWith('sellAsset.amount', '')
    expect(setValue).toBeCalledWith('fiatAmount', '')
  })
})
