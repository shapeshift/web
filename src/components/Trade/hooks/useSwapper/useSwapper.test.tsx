import { SwapperManager } from '@shapeshiftoss/swapper'
import { act, renderHook } from '@testing-library/react-hooks'
import { getConfig } from 'config'
import debounce from 'lodash/debounce'
import { useFormContext, useWatch } from 'react-hook-form'
import { ChainAdaptersProvider } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { FOX, USDC, WETH } from 'jest/constants'
import { fromBaseUnit } from 'lib/math'

import { QUOTE } from '../../../../jest/constants'
import { TradeActions, useSwapper } from './useSwapper'

const unchainedUrls = { ethereum: getConfig().REACT_APP_UNCHAINED_ETHEREUM_URL }

jest.mock('react-hook-form')
jest.mock('lodash/debounce')
jest.mock('@shapeshiftoss/swapper')

function setup() {
  const setValue = jest.fn()
  const setError = jest.fn()
  const clearErrors = jest.fn()
  const getBestSwapper = jest.fn()
  const getQuote = jest.fn(() => QUOTE)
  ;(SwapperManager as jest.Mock<unknown>).mockImplementation(() => ({
    getSwapper: () => ({
      getDefaultPair: () => [FOX, WETH],
      getMinMax: jest.fn(),
      getUsdRate: () => '1',
      getQuote
    }),
    addSwapper: jest.fn(),
    getBestSwapper
  }))
  ;(debounce as jest.Mock<unknown>).mockImplementation(fn => fn)
  ;(useWatch as jest.Mock<unknown>).mockImplementation(() => [{ rate: '1.2' }, {}])
  ;(useFormContext as jest.Mock<unknown>).mockImplementation(() => ({
    setValue,
    setError,
    clearErrors
  }))
  const wrapper: React.FC = ({ children }) => (
    <ChainAdaptersProvider unchainedUrls={unchainedUrls}>{children}</ChainAdaptersProvider>
  )
  const hook = renderHook(() => useSwapper(), { wrapper })
  return { hook, setValue, setError, clearErrors, getQuote, getBestSwapper }
}

describe('useSwapper', () => {
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
  it('getCryptoQuote gets quote with sellAmount', async () => {
    const { hook, setValue } = setup()
    await act(async () => {
      hook.result.current.getCryptoQuote(
        { sellAmount: '20' },
        { currency: WETH },
        { currency: USDC },
        TradeActions.SELL
      )
    })
    const buyAmount = fromBaseUnit(QUOTE.buyAmount || '0', QUOTE.buyAsset.precision)
    expect(setValue).toHaveBeenCalledWith('quote', QUOTE)
    expect(setValue).toHaveBeenNthCalledWith(2, 'sellAsset.fiatRate', '1')
    expect(setValue).toHaveBeenNthCalledWith(3, 'buyAsset.fiatRate', '0.00026046624288885352')
    expect(setValue).toHaveBeenNthCalledWith(4, 'buyAsset.amount', buyAmount)
    expect(setValue).toHaveBeenNthCalledWith(5, 'fiatAmount', '0.00')
  })
  it('getCryptoQuote gets quote with buyAmount', async () => {
    const { hook, setValue } = setup()
    await act(async () => {
      hook.result.current.getCryptoQuote(
        { buyAmount: '20' },
        { currency: WETH },
        { currency: USDC },
        TradeActions.SELL
      )
    })
    const sellAmount = fromBaseUnit(QUOTE.sellAmount || '0', QUOTE.sellAsset.precision)
    expect(setValue).toHaveBeenCalledWith('quote', QUOTE)
    expect(setValue).toHaveBeenNthCalledWith(2, 'sellAsset.fiatRate', '1')
    expect(setValue).toHaveBeenNthCalledWith(3, 'buyAsset.fiatRate', '0.00026046624288885352')
    expect(setValue).toHaveBeenNthCalledWith(4, 'sellAsset.amount', sellAmount)
    expect(setValue).toHaveBeenNthCalledWith(5, 'fiatAmount', '0.00')
  })
  it('getCryptoQuote needs buyAsset or sellAsset', async () => {
    const { hook, getQuote } = setup()
    await act(async () => {
      hook.result.current.getCryptoQuote(
        { sellAmount: '20' },
        //@ts-ignore
        { currency: undefined },
        { currency: undefined },
        TradeActions.SELL
      )
    })
    expect(getQuote).not.toHaveBeenCalled()
  })
  it('getFiatQuote gets quote with fiatAmount', async () => {
    const { hook, setValue } = setup()
    await act(async () => {
      hook.result.current.getFiatQuote(
        '20',
        { currency: WETH },
        { currency: USDC },
        TradeActions.SELL
      )
    })
    const buyAmount = fromBaseUnit(QUOTE.buyAmount || '0', QUOTE.buyAsset.precision)
    const sellAmount = fromBaseUnit(QUOTE.sellAmount || '0', QUOTE.sellAsset.precision)
    expect(setValue).toHaveBeenCalledWith('quote', QUOTE)
    expect(setValue).toHaveBeenNthCalledWith(2, 'sellAsset.fiatRate', '1')
    expect(setValue).toHaveBeenNthCalledWith(3, 'buyAsset.fiatRate', '0.00026046624288885352')
    expect(setValue).toHaveBeenNthCalledWith(4, 'buyAsset.amount', buyAmount)
    expect(setValue).toHaveBeenNthCalledWith(5, 'sellAsset.amount', sellAmount)
  })
  it('getFiatQuote needs buyAsset or sellAsset', async () => {
    const { hook, getQuote } = setup()
    await act(async () => {
      hook.result.current.getFiatQuote(
        '2323',
        //@ts-ignore
        { currency: undefined },
        { currency: undefined },
        TradeActions.SELL
      )
    })
    expect(getQuote).not.toHaveBeenCalled()
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
