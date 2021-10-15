import { NetworkTypes, SwapperType } from '@shapeshiftoss/types'
import { renderHook } from '@testing-library/react-hooks'
import { useFormContext, useWatch } from 'react-hook-form'
import { TradeActions, useSwapper } from 'components/Trade/hooks/useSwapper/useSwapper'
import { useAssets } from 'context/AssetProvider/AssetProvider'
import { FOX, WETH } from 'jest/assets'
import { TestProviders } from 'jest/TestProviders'

import { useTradeRoutes } from './useTradeRotues'

jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    push: jest.fn()
  })
}))
jest.mock('react-hook-form')
jest.mock('../useSwapper/useSwapper')
jest.mock('context/AssetProvider/AssetProvider')

function setup() {
  const getCryptoQuote = jest.fn()
  const setValue = jest.fn()
  ;(useWatch as jest.Mock<unknown>).mockImplementation(() => [{}, {}])
  ;(useSwapper as jest.Mock<unknown>).mockImplementation(() => ({
    getCryptoQuote: getCryptoQuote,
    getFiatQuote: jest.fn(),
    getBestSwapper: () => SwapperType.Zrx,
    getDefaultPair: () => [FOX, WETH]
  }))
  ;(useAssets as jest.Mock<unknown>).mockImplementation(() => ({
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
  return { hook, setValue, getCryptoQuote }
}

describe('useTradeRoutes', () => {
  it('sets the default assets', () => {
    const { getCryptoQuote, setValue } = setup()
    expect(setValue).toHaveBeenCalledWith('sellAsset.currency', FOX)
    expect(setValue).toHaveBeenCalledWith('buyAsset.currency', WETH)
    expect(getCryptoQuote).toHaveBeenCalled()
  })
  it('handles sell click', async () => {
    const { hook, setValue, getCryptoQuote } = setup()
    await hook?.result?.current?.handleSellClick(WETH)
    expect(setValue).toHaveBeenCalledWith('sellAsset.currency', WETH)
    expect(setValue).toHaveBeenCalledWith('action', TradeActions.SELL)
    expect(getCryptoQuote).toHaveBeenCalled()
  })
  it('swaps when same asset on sell click', async () => {
    const { hook, setValue, getCryptoQuote } = setup()
    await hook?.result?.current?.handleSellClick(FOX)
    expect(setValue).toHaveBeenCalledWith('buyAsset.currency', WETH)
    expect(setValue).toHaveBeenCalledWith('sellAsset.currency', FOX)
    expect(setValue).toHaveBeenCalledWith('action', TradeActions.SELL)
    expect(getCryptoQuote).toHaveBeenCalled()
  })
  it('handles buy click', async () => {
    const { hook, setValue, getCryptoQuote } = setup()
    await hook?.result?.current?.handleBuyClick(FOX)
    expect(setValue).toHaveBeenCalledWith('buyAsset.currency', FOX)
    expect(setValue).toHaveBeenCalledWith('action', TradeActions.BUY)
    expect(getCryptoQuote).toHaveBeenCalled()
  })
  it('swaps when same asset on buy click', async () => {
    const { hook, setValue, getCryptoQuote } = setup()
    await hook?.result?.current?.handleBuyClick(WETH)
    expect(setValue).toHaveBeenCalledWith('sellAsset.currency', FOX)
    expect(setValue).toHaveBeenCalledWith('buyAsset.currency', WETH)
    expect(setValue).toHaveBeenCalledWith('action', TradeActions.BUY)
    expect(getCryptoQuote).toHaveBeenCalled()
  })
})
