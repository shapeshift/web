import { ethAssetId as mockEthAssetId, foxAssetId as mockFoxAssetId } from '@keepkey/caip'
import { renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { ETH as mockETH, FOX as mockFOX, WETH } from 'test/constants'
import { mockChainAdapters } from 'test/mocks/portfolio'
import { TestProviders } from 'test/TestProviders'
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapper'
import { TradeAmountInputField } from 'components/Trade/types'

import { AssetClickAction, useTradeRoutes } from './useTradeRoutes'

jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    push: jest.fn(),
  }),
}))
jest.mock('lib/web3-instance')
jest.mock('react-hook-form')
jest.mock('../useSwapper/useSwapper')
jest.mock('hooks/useWallet/useWallet', () => ({
  useWallet: () => ({
    state: { wallet: {} },
  }),
}))
jest.mock('@keepkey/swapper')
jest.mock('state/slices/selectors', () => ({
  selectAssets: () => ({
    [mockEthAssetId]: mockETH,
    [mockFoxAssetId]: mockFOX,
  }),
  selectAssetById: () => ({
    [mockEthAssetId]: mockETH,
  }),
  selectPortfolioAccountIdsByAssetId: () => ({
    [mockEthAssetId]: '0xFoo',
    [mockFoxAssetId]: '0xFoo',
  }),
  selectBIP44ParamsByAccountId: () => ({ purpose: 44, coinType: 60, accountNumber: 0 }),
  selectPortfolioAccountMetadataByAccountId: () => ({
    bip44Params: { purpose: 44, coinType: 60, accountNumber: 0 },
    accountType: undefined,
  }),

  selectAccountSpecifiers: () => ({}),
  selectFiatToUsdRate: () => ({}),
}))
jest.mock('context/PluginProvider/chainAdapterSingleton', () => ({
  getChainAdapterManager: () => mockChainAdapters,
}))

function setup({ buyAmount, sellAmount }: { buyAmount?: string; sellAmount?: string }) {
  const setValue = jest.fn()
  ;(useWatch as jest.Mock<unknown>).mockImplementation(() => [{}, {}])
  ;(useSwapper as jest.Mock<unknown>).mockImplementation(() => ({}))
  ;(useFormContext as jest.Mock<unknown>).mockImplementation(() => ({
    setValue,
    getValues: jest.fn((search: string) => {
      const data = {
        buyTradeAsset: {
          asset: mockFOX,
          amount: buyAmount,
        },
        sellTradeAsset: {
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
  const { result } = renderHook(() => useTradeRoutes(), { wrapper })
  return { result, setValue }
}

describe('useTradeRoutes', () => {
  it('handles sell click with no buy amount', async () => {
    const { result, setValue } = setup({})
    await result.current.handleAssetClick(WETH, AssetClickAction.Sell)
    expect(setValue).toHaveBeenCalledWith('sellTradeAsset.asset', WETH)
    expect(setValue).toHaveBeenCalledWith('action', TradeAmountInputField.SELL_FIAT)
  })
  it('handles sell click with buy amount', async () => {
    const { result, setValue } = setup({ buyAmount: '23' })
    await result.current.handleAssetClick(WETH, AssetClickAction.Sell)
    expect(setValue).toHaveBeenCalledWith('sellTradeAsset.asset', WETH)
    expect(setValue).toHaveBeenCalledWith('action', TradeAmountInputField.SELL_FIAT)
  })
  it('swaps when same asset on sell click', async () => {
    const { result, setValue } = setup({})
    await result.current.handleAssetClick(mockFOX, AssetClickAction.Sell)
    expect(setValue).toHaveBeenCalledWith('buyTradeAsset.asset', WETH)
    expect(setValue).toHaveBeenCalledWith('action', TradeAmountInputField.SELL_FIAT)
  })
  it('handles buy click with no sell amount', async () => {
    const { result, setValue } = setup({})
    await result.current.handleAssetClick(mockFOX, AssetClickAction.Buy)
    expect(setValue).toHaveBeenCalledWith('buyTradeAsset.asset', mockFOX)
    expect(setValue).toHaveBeenCalledWith('action', TradeAmountInputField.SELL_FIAT)
  })
  it('handles buy click with sell amount', async () => {
    const { result, setValue } = setup({ sellAmount: '234' })
    await result.current.handleAssetClick(mockFOX, AssetClickAction.Buy)
    expect(setValue).toHaveBeenCalledWith('buyTradeAsset.asset', mockFOX)
    expect(setValue).toHaveBeenCalledWith('action', TradeAmountInputField.SELL_FIAT)
  })
  it('swaps when same asset on buy click', async () => {
    const { result, setValue } = setup({})
    await result.current.handleAssetClick(WETH, AssetClickAction.Buy)
    expect(setValue).toHaveBeenCalledWith('buyTradeAsset.asset', WETH)
    expect(setValue).toHaveBeenCalledWith('action', TradeAmountInputField.SELL_FIAT)
  })
})
