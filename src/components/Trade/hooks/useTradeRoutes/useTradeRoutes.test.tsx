import { SwapperType } from '@shapeshiftoss/types'
import { renderHook } from '@testing-library/react-hooks'
import { useFormContext, useWatch } from 'react-hook-form'
import { ETH as mockETH, FOX as mockFOX, WETH } from 'test/constants'
import { TestProviders } from 'test/TestProviders'
import { TradeAmountInputField, useSwapper } from 'components/Trade/hooks/useSwapper/useSwapper'

import { useTradeRoutes } from './useTradeRoutes'

jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    push: jest.fn(),
  }),
}))
jest.mock('lib/web3-instance')
jest.mock('react-hook-form')
jest.mock('../useSwapper/useSwapper')
jest.mock('state/slices/selectors', () => ({
  selectAssets: () => ({
    'eip155:1/slip44:60': mockETH,
    'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d': mockFOX,
  }),
}))

function setup({ buyAmount, sellAmount }: { buyAmount?: string; sellAmount?: string }) {
  const getQuote = jest.fn()
  const setValue = jest.fn()
  ;(useWatch as jest.Mock<unknown>).mockImplementation(() => [{}, {}])
  ;(useSwapper as jest.Mock<unknown>).mockImplementation(() => ({
    getQuote,
    getBestSwapper: () => SwapperType.Zrx,
    getDefaultPair: () => [mockETH.assetId, mockFOX.assetId],
  }))
  ;(useFormContext as jest.Mock<unknown>).mockImplementation(() => ({
    setValue,
    getValues: jest.fn((search: string) => {
      const data = {
        buyAsset: {
          currency: mockFOX,
          amount: buyAmount,
        },
        sellAsset: {
          currency: WETH,
          amount: sellAmount,
        },
      }
      //@ts-ignore
      return data[search]
    }),
  }))
  const wrapper: React.FC = ({ children }) => <TestProviders>{children}</TestProviders>
  const { result, waitFor } = renderHook(() => useTradeRoutes(), { wrapper })
  return { result, waitFor, setValue, getQuote }
}

describe('useTradeRoutes', () => {
  it('sets the default assets', async () => {
    const { getQuote, setValue, waitFor } = await setup({})
    await waitFor(() => expect(getQuote).toHaveBeenCalled())
    expect(setValue).toHaveBeenCalledWith('sellAsset.currency', mockETH)
    expect(setValue).toHaveBeenCalledWith('buyAsset.currency', mockFOX)
    expect(getQuote).toHaveBeenCalled()
  })
  it('handles sell click with no buy amount', async () => {
    const { result, setValue, getQuote } = setup({})
    await result.current.handleSellClick(WETH)
    expect(setValue).toHaveBeenCalledWith('sellAsset.currency', WETH)
    expect(setValue).toHaveBeenCalledWith('action', undefined)
    expect(getQuote).toHaveBeenCalled()
  })
  it('handles sell click with buy amount', async () => {
    const { result, setValue, getQuote } = setup({ buyAmount: '23' })
    await result.current.handleSellClick(WETH)
    expect(setValue).toHaveBeenCalledWith('sellAsset.currency', WETH)
    expect(setValue).toHaveBeenCalledWith('action', TradeAmountInputField.SELL)
    expect(getQuote).toHaveBeenCalled()
  })
  it('swaps when same asset on sell click', async () => {
    const { result, setValue, getQuote } = setup({})
    await result.current.handleSellClick(mockFOX)
    expect(setValue).toHaveBeenCalledWith('buyAsset.currency', WETH)
    expect(setValue).toHaveBeenCalledWith('sellAsset.currency', mockFOX)
    expect(getQuote).toHaveBeenCalled()
  })
  it('handles buy click with no sell amount', async () => {
    const { result, setValue, getQuote } = setup({})
    await result.current.handleBuyClick(mockFOX)
    expect(setValue).toHaveBeenCalledWith('buyAsset.currency', mockFOX)
    expect(setValue).toHaveBeenCalledWith('action', undefined)
    expect(getQuote).toHaveBeenCalled()
  })
  it('handles buy click with sell amount', async () => {
    const { result, setValue, getQuote } = setup({ sellAmount: '234' })
    await result.current.handleBuyClick(mockFOX)
    expect(setValue).toHaveBeenCalledWith('buyAsset.currency', mockFOX)
    expect(setValue).toHaveBeenCalledWith('action', TradeAmountInputField.BUY)
    expect(getQuote).toHaveBeenCalled()
  })
  it('swaps when same asset on buy click', async () => {
    const { result, setValue, getQuote } = setup({})
    await result.current.handleBuyClick(WETH)
    expect(setValue).toHaveBeenCalledWith('sellAsset.currency', mockFOX)
    expect(setValue).toHaveBeenCalledWith('buyAsset.currency', WETH)
    expect(getQuote).toHaveBeenCalled()
  })
})
