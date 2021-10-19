import { NetworkTypes, SwapperType } from '@shapeshiftoss/types'
import { renderHook } from '@testing-library/react-hooks'
import { useFormContext, useWatch } from 'react-hook-form'
import { TradeActions, useSwapper } from 'components/Trade/hooks/useSwapper/useSwapper'
import { FOX, WETH } from 'jest/constants'
import { TestProviders } from 'jest/TestProviders'
import { getAssetService } from 'lib/assetService'

import { useTradeRoutes } from './useTradeRoutes'

jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    push: jest.fn()
  })
}))
jest.mock('react-hook-form')
jest.mock('../useSwapper/useSwapper')
jest.mock('lib/assetService')

function setup() {
  const getQuote = jest.fn()
  const setValue = jest.fn()
  ;(useWatch as jest.Mock<unknown>).mockImplementation(() => [{}, {}])
  ;(useSwapper as jest.Mock<unknown>).mockImplementation(() => ({
    getQuote: getQuote,
    getBestSwapper: () => SwapperType.Zrx,
    getDefaultPair: () => [FOX, WETH]
  }))
  ;(getAssetService as unknown as jest.Mock<unknown>).mockImplementation(() => ({
    byNetwork: (_: NetworkTypes) => [FOX, WETH]
  }))
  ;(useFormContext as jest.Mock<unknown>).mockImplementation(() => ({
    setValue,
    getValues: () => ({
      buyAsset: {
        currency: FOX
      },
      sellAsset: {
        currency: WETH
      }
    })
  }))
  const wrapper: React.FC = ({ children }) => <TestProviders>{children}</TestProviders>
  const hook = renderHook(() => useTradeRoutes(), { wrapper })
  return { hook, setValue, getQuote }
}

describe('useTradeRoutes', () => {
  it('sets the default assets', async () => {
    const { getQuote, setValue } = await setup()
    expect(setValue).toHaveBeenCalledWith('sellAsset.currency', FOX)
    expect(setValue).toHaveBeenCalledWith('buyAsset.currency', WETH)
    expect(getQuote).toHaveBeenCalled()
  })
  it('handles sell click', async () => {
    const { hook, setValue, getQuote } = setup()
    await hook?.result?.current?.handleSellClick(WETH)
    expect(setValue).toHaveBeenCalledWith('sellAsset.currency', WETH)
    expect(setValue).toHaveBeenCalledWith('action', TradeActions.SELL)
    expect(getQuote).toHaveBeenCalled()
  })
  it('swaps when same asset on sell click', async () => {
    const { hook, setValue, getQuote } = setup()
    await hook?.result?.current?.handleSellClick(FOX)
    expect(setValue).toHaveBeenCalledWith('buyAsset.currency', WETH)
    expect(setValue).toHaveBeenCalledWith('sellAsset.currency', FOX)
    expect(setValue).toHaveBeenCalledWith('action', TradeActions.SELL)
    expect(getQuote).toHaveBeenCalled()
  })
  it('handles buy click', async () => {
    const { hook, setValue, getQuote } = setup()
    await hook?.result?.current?.handleBuyClick(FOX)
    expect(setValue).toHaveBeenCalledWith('buyAsset.currency', FOX)
    expect(setValue).toHaveBeenCalledWith('action', TradeActions.BUY)
    expect(getQuote).toHaveBeenCalled()
  })
  it('swaps when same asset on buy click', async () => {
    const { hook, setValue, getQuote } = setup()
    await hook?.result?.current?.handleBuyClick(WETH)
    expect(setValue).toHaveBeenCalledWith('sellAsset.currency', FOX)
    expect(setValue).toHaveBeenCalledWith('buyAsset.currency', WETH)
    expect(setValue).toHaveBeenCalledWith('action', TradeActions.BUY)
    expect(getQuote).toHaveBeenCalled()
  })
})
