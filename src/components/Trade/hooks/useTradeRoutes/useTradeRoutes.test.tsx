import { renderHook } from '@testing-library/react-hooks'
import { PropsWithChildren } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { ETH as mockETH, FOX as mockFOX, WETH } from 'test/constants'
import { TestProviders } from 'test/TestProviders'
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapper'
import { TradeAmountInputField } from 'components/Trade/types'

import { useTradeRoutes } from './useTradeRoutes'

jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    push: jest.fn(),
  }),
}))
jest.mock('lib/web3-instance')
jest.mock('react-hook-form')
jest.mock('../useSwapper/useSwapper')
jest.mock('@shapeshiftoss/swapper')
jest.mock('state/slices/selectors', () => ({
  selectAssets: () => ({
    'eip155:1/slip44:60': mockETH,
    'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d': mockFOX,
  }),
  selectAssetById: () => ({
    'eip155:1/slip44:60': mockETH,
  }),
}))

function setup({ buyAmount, sellAmount }: { buyAmount?: string; sellAmount?: string }) {
  const updateQuote = jest.fn()
  const setValue = jest.fn()
  ;(useWatch as jest.Mock<unknown>).mockImplementation(() => [{}, {}])
  ;(useSwapper as jest.Mock<unknown>).mockImplementation(() => ({
    updateQuote,
    getDefaultPair: () => [mockETH.assetId, mockFOX.assetId],
    swapperManager: {
      getBestSwapper: jest.fn(),
    },
  }))
  ;(useFormContext as jest.Mock<unknown>).mockImplementation(() => ({
    setValue,
    getValues: jest.fn((search: string) => {
      const data = {
        buyAsset: {
          asset: mockFOX,
          amount: buyAmount,
        },
        sellAsset: {
          asset: WETH,
          amount: sellAmount,
        },
      }
      //@ts-ignore
      return data[search]
    }),
  }))
  const wrapper: React.FC<PropsWithChildren> = ({ children }) => (
    <TestProviders>{children}</TestProviders>
  )
  const { result, waitFor } = renderHook(() => useTradeRoutes(), { wrapper })
  return { result, waitFor, setValue, updateQuote }
}

describe('useTradeRoutes', () => {
  it('sets the default assets', async () => {
    const { updateQuote, setValue, waitFor } = await setup({})
    await waitFor(() => expect(updateQuote).toHaveBeenCalled())
    expect(setValue).toHaveBeenCalledWith('sellAsset.asset', mockETH)
    expect(setValue).toHaveBeenCalledWith('buyAsset.asset', mockFOX)
    expect(updateQuote).toHaveBeenCalled()
  })
  it('handles sell click with no buy amount', async () => {
    const { result, setValue, updateQuote } = setup({})
    await result.current.handleSellClick(WETH)
    expect(setValue).toHaveBeenCalledWith('sellAsset.asset', WETH)
    expect(setValue).toHaveBeenCalledWith('action', undefined)
    expect(updateQuote).toHaveBeenCalled()
  })
  it('handles sell click with buy amount', async () => {
    const { result, setValue, updateQuote } = setup({ buyAmount: '23' })
    await result.current.handleSellClick(WETH)
    expect(setValue).toHaveBeenCalledWith('sellAsset.asset', WETH)
    expect(setValue).toHaveBeenCalledWith('action', TradeAmountInputField.SELL)
    expect(updateQuote).toHaveBeenCalled()
  })
  it('swaps when same asset on sell click', async () => {
    const { result, setValue, updateQuote } = setup({})
    await result.current.handleSellClick(mockFOX)
    expect(setValue).toHaveBeenCalledWith('buyAsset.asset', WETH)
    expect(setValue).toHaveBeenCalledWith('sellAsset.asset', mockFOX)
    expect(updateQuote).toHaveBeenCalled()
  })
  it('handles buy click with no sell amount', async () => {
    const { result, setValue, updateQuote } = setup({})
    await result.current.handleBuyClick(mockFOX)
    expect(setValue).toHaveBeenCalledWith('buyAsset.asset', mockFOX)
    expect(setValue).toHaveBeenCalledWith('action', undefined)
    expect(updateQuote).toHaveBeenCalled()
  })
  it.only('handles buy click with sell amount', async () => {
    const { result, setValue, updateQuote } = setup({ sellAmount: '234' })
    await result.current.handleBuyClick(mockFOX)
    expect(setValue).toHaveBeenCalledWith('buyAsset.asset', mockFOX)
    expect(setValue).toHaveBeenCalledWith('sellAsset.asset', WETH)
    expect(updateQuote).toHaveBeenCalled()
  })
  it('swaps when same asset on buy click', async () => {
    const { result, setValue, updateQuote } = setup({})
    await result.current.handleBuyClick(WETH)
    expect(setValue).toHaveBeenCalledWith('buyAsset.asset', WETH)
    expect(setValue).toHaveBeenCalledWith('sellAsset.asset', mockFOX)
    expect(updateQuote).toHaveBeenCalled()
  })
})
