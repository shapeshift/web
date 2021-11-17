import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { SwapperManager } from '@shapeshiftoss/swapper'
import { act, renderHook } from '@testing-library/react-hooks'
import debounce from 'lodash/debounce'
import { useFormContext, useWatch } from 'react-hook-form'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { ETHCHAIN_QUOTE_FEES, FOX, MIN_MAX, USDC, WETH } from 'jest/constants'
import { TestProviders } from 'jest/TestProviders'
import { fromBaseUnit } from 'lib/math'

import { ETHCHAIN_QUOTE } from '../../../../jest/constants'
import { TradeActions, useSwapper } from './useSwapper'

jest.mock('lib/web3-instance')
jest.mock('react-hook-form')
jest.mock('lodash/debounce')
jest.mock('@shapeshiftoss/swapper')
jest.mock('context/ChainAdaptersProvider/ChainAdaptersProvider')

function setup({
  action = TradeActions.SELL,
  approvalNeededBoolean = false,
  quote = { rate: '1.2' },
  minMax = MIN_MAX
} = {}) {
  const setValue = jest.fn()
  const setError = jest.fn()
  const clearErrors = jest.fn()
  const getBestSwapper = jest.fn()
  const getQuote = jest.fn(() => ETHCHAIN_QUOTE)
  const wallet = {} as HDWallet
  ;(SwapperManager as jest.Mock<unknown>).mockImplementation(() => ({
    getSwapper: () => ({
      getDefaultPair: () => [FOX, WETH],
      getMinMax: jest.fn(() => minMax),
      getUsdRate: () => '1',
      approvalNeeded: () => ({ approvalNeeded: approvalNeededBoolean }),
      approveInfinite: () => '0x023423093248420937',
      getQuote
    }),
    addSwapper: jest.fn(),
    getBestSwapper
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
      fiatAmount: '20'
    }),
    clearErrors
  }))
  const wrapper: React.FC = ({ children }) => <TestProviders>{children}</TestProviders>
  const hook = renderHook(() => useSwapper(), { wrapper })
  return { hook, wallet, setValue, setError, clearErrors, getQuote, getBestSwapper }
}

describe('useSwapper', () => {
  beforeEach(() => {
    ;(useChainAdapters as jest.Mock<unknown>).mockImplementation(() => ({
      byChain: jest.fn(),
      getSupportedAdapters: jest.fn(),
      addChain: jest.fn(),
      getSupportedChains: jest.fn()
    }))
  })
  it('approves infinite', async () => {
    const { hook, wallet } = setup()
    const txid = await hook.result.current.approveInfinite(wallet)
    expect(txid).toBe('0x023423093248420937')
  })
  it('gets approval needed', async () => {
    const { hook, wallet } = setup()
    const approvalNeeded = await hook.result.current.checkApprovalNeeded(wallet)
    expect(approvalNeeded).toBe(false)
  })
  it('returns true when approval is needed', async () => {
    const { hook, wallet } = setup({ approvalNeededBoolean: true })

    const approvalNeeded = await hook.result.current.checkApprovalNeeded(wallet)
    expect(approvalNeeded).toBe(true)
  })
  it('gets default pair', () => {
    const { hook } = setup()
    const defaultPair = hook.result.current.getDefaultPair()
    expect(defaultPair).toHaveLength(2)
  })
  it('swappermanager initializes with swapper', () => {
    const { hook } = setup()
    const swapperManager = hook.result.current.swapperManager
    expect(swapperManager).not.toBeNull()
  })
  it('getQuote gets quote with sellAmount', async () => {
    const { hook, setValue } = setup({ action: TradeActions.SELL })
    await act(async () => {
      hook.result.current.getQuote({
        amount: '20',
        sellAsset: { currency: WETH },
        buyAsset: { currency: USDC },
        action: TradeActions.SELL
      })
    })
    const buyAmount = fromBaseUnit(
      ETHCHAIN_QUOTE.buyAmount || '0',
      ETHCHAIN_QUOTE.buyAsset.precision
    )
    expect(setValue).toHaveBeenNthCalledWith(1, 'trade', MIN_MAX)
    expect(setValue).toHaveBeenNthCalledWith(2, 'fees', ETHCHAIN_QUOTE_FEES)
    expect(setValue).toHaveBeenNthCalledWith(3, 'quote', ETHCHAIN_QUOTE)
    expect(setValue).toHaveBeenNthCalledWith(4, 'sellAsset.fiatRate', '1')
    expect(setValue).toHaveBeenNthCalledWith(5, 'buyAsset.fiatRate', '0.00026046624288885352')
    expect(setValue).toHaveBeenNthCalledWith(6, 'buyAsset.amount', buyAmount)
    expect(setValue).toHaveBeenNthCalledWith(7, 'fiatAmount', '0.00')
  })
  it('getQuote gets quote with buyAmount', async () => {
    const { hook, setValue } = setup({ action: TradeActions.BUY })
    await act(async () => {
      hook.result.current.getQuote({
        amount: '20',
        sellAsset: { currency: WETH },
        buyAsset: { currency: USDC },
        action: TradeActions.BUY
      })
    })
    const sellAmount = fromBaseUnit(
      ETHCHAIN_QUOTE.sellAmount || '0',
      ETHCHAIN_QUOTE.sellAsset.precision
    )
    expect(setValue).toHaveBeenNthCalledWith(1, 'trade', MIN_MAX)
    expect(setValue).toHaveBeenNthCalledWith(2, 'fees', ETHCHAIN_QUOTE_FEES)
    expect(setValue).toHaveBeenNthCalledWith(3, 'quote', ETHCHAIN_QUOTE)
    expect(setValue).toHaveBeenNthCalledWith(4, 'sellAsset.fiatRate', '1')
    expect(setValue).toHaveBeenNthCalledWith(5, 'buyAsset.fiatRate', '0.00026046624288885352')
    expect(setValue).toHaveBeenNthCalledWith(6, 'sellAsset.amount', sellAmount)
    expect(setValue).toHaveBeenNthCalledWith(7, 'fiatAmount', '0.00')
  })
  it('getQuote needs buyAsset or sellAsset', async () => {
    const { hook, getQuote } = setup({ action: TradeActions.FIAT })
    await act(async () => {
      hook.result.current.getQuote({
        amount: '20',
        //@ts-ignore
        sellAsset: { currency: undefined },
        //@ts-ignore
        buyAsset: { currency: undefined }
      })
    })
    expect(getQuote).not.toHaveBeenCalled()
  })
  it('getQuote gets quote with fiatAmount', async () => {
    const { hook, setValue } = setup({ action: TradeActions.FIAT })
    await act(async () => {
      hook.result.current.getQuote({
        amount: '20',
        sellAsset: { currency: WETH },
        buyAsset: { currency: USDC },
        action: TradeActions.FIAT
      })
    })
    const buyAmount = fromBaseUnit(
      ETHCHAIN_QUOTE.buyAmount || '0',
      ETHCHAIN_QUOTE.buyAsset.precision
    )
    const sellAmount = fromBaseUnit(
      ETHCHAIN_QUOTE.sellAmount || '0',
      ETHCHAIN_QUOTE.sellAsset.precision
    )
    expect(setValue).toHaveBeenNthCalledWith(1, 'trade', MIN_MAX)
    expect(setValue).toHaveBeenNthCalledWith(2, 'fees', ETHCHAIN_QUOTE_FEES)
    expect(setValue).toHaveBeenNthCalledWith(3, 'quote', ETHCHAIN_QUOTE)
    expect(setValue).toHaveBeenNthCalledWith(4, 'sellAsset.fiatRate', '1')
    expect(setValue).toHaveBeenNthCalledWith(5, 'buyAsset.fiatRate', '0.00026046624288885352')
    expect(setValue).toHaveBeenNthCalledWith(6, 'buyAsset.amount', buyAmount)
    expect(setValue).toHaveBeenNthCalledWith(7, 'sellAsset.amount', sellAmount)
  })
  it('getQuote sets trade value with minMax if no quote is in state', async () => {
    const minMax = { minimum: '1000', minimumAmount: '1' }
    //@ts-ignore
    const { hook, setValue } = setup({ quote: null, minMax })
    await act(async () => {
      hook.result.current.getQuote({
        amount: '20',
        sellAsset: { currency: WETH },
        buyAsset: { currency: USDC },
        action: TradeActions.SELL
      })
    })
    const buyAmount = fromBaseUnit(
      ETHCHAIN_QUOTE.buyAmount || '0',
      ETHCHAIN_QUOTE.buyAsset.precision
    )
    expect(setValue).toHaveBeenNthCalledWith(1, 'trade', minMax)
    expect(setValue).toHaveBeenNthCalledWith(2, 'fees', ETHCHAIN_QUOTE_FEES)
    expect(setValue).toHaveBeenNthCalledWith(3, 'quote', ETHCHAIN_QUOTE)
    expect(setValue).toHaveBeenNthCalledWith(4, 'sellAsset.fiatRate', '1')
    expect(setValue).toHaveBeenNthCalledWith(5, 'buyAsset.fiatRate', '0.00026046624288885352')
    expect(setValue).toHaveBeenNthCalledWith(6, 'buyAsset.amount', buyAmount)
    expect(setValue).toHaveBeenNthCalledWith(7, 'fiatAmount', '0.00')
  })
  it('getBestSwapper gets best swapper', async () => {
    const { hook, getBestSwapper } = setup()
    await act(async () => {
      await hook.result.current.getBestSwapper({
        sellAsset: { currency: WETH },
        buyAsset: { currency: FOX }
      })
    })
    expect(getBestSwapper).toHaveBeenCalled()
  })
  it('reset resets', () => {
    const { hook, setValue } = setup()
    const reset = hook.result.current.reset
    reset()
    expect(setValue).toBeCalledWith('buyAsset.amount', '')
    expect(setValue).toBeCalledWith('sellAsset.amount', '')
    expect(setValue).toBeCalledWith('fiatAmount', '')
  })
})
