import { findByCaip19 } from '@shapeshiftoss/market-service'
import { chainAdapters } from '@shapeshiftoss/types'
import { act, renderHook } from '@testing-library/react-hooks'
import { useFormContext, useWatch } from 'react-hook-form'
import { useHistory } from 'react-router-dom'
import { ethereum as mockEthereum, rune as mockRune } from 'test/mocks/assets'
import { TestProviders } from 'test/TestProviders'
import { mocked } from 'ts-jest/utils'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { selectFeeAssetById } from 'state/slices/assetsSlice/assetsSlice'
import { selectMarketDataById } from 'state/slices/marketDataSlice/marketDataSlice'
import {
  PortfolioBalancesById,
  selectPortfolioCryptoBalanceByAssetId
} from 'state/slices/portfolioSlice/portfolioSlice'

import { useSendDetails } from './useSendDetails'

jest.mock('@shapeshiftoss/market-service')
jest.mock('react-hook-form')
jest.mock('react-router-dom', () => ({ useHistory: jest.fn() }))
jest.mock('context/WalletProvider/WalletProvider')
jest.mock('context/ChainAdaptersProvider/ChainAdaptersProvider')

jest.mock('state/slices/assetsSlice/assetsSlice', () => ({
  ...jest.requireActual('state/slices/assetsSlice/assetsSlice'),
  selectFeeAssetById: jest.fn()
}))

jest.mock('state/slices/portfolioSlice/portfolioSlice', () => ({
  ...jest.requireActual('state/slices/portfolioSlice/portfolioSlice'),
  selectPortfolioCryptoBalanceByAssetId: jest.fn()
}))

const ethCaip19 = 'eip155:1/slip44:60'
const runeCaip19 = 'eip155:1/erc20:0x3155ba85d5f96b2d030a4966af206230e46849cb'

const balances: PortfolioBalancesById = {
  [ethCaip19]: '5000000000000000000',
  [runeCaip19]: '21000000000000000000'
}

const estimatedFees = {
  [chainAdapters.FeeDataKey.Fast]: {
    networkFee: '6000000000000000',
    chainSpecific: {
      feePerTx: '6000000000000000'
    }
  }
}

jest.mock('state/slices/marketDataSlice/marketDataSlice', () => ({
  ...jest.requireActual('state/slices/marketDataSlice/marketDataSlice'),
  selectMarketDataById: jest.fn()
}))

const setup = ({
  asset = mockEthereum,
  assetBalance = '',
  formErrors = {},
  setError = jest.fn(),
  setValue = jest.fn()
}) => {
  ;(useWatch as jest.Mock<unknown>).mockImplementation(({ name }) =>
    name === 'asset' ? asset : '0x3155BA85D5F96b2d030a4966AF206230e46849cb'
  )
  mocked(selectMarketDataById).mockImplementation((_state, assetId) => {
    const fakeMarketData = {
      [mockEthereum.caip19]: {
        price: '3500',
        marketCap: 'bigly',
        volume: 'lots',
        changePercent24Hr: 420.69
      },
      [mockRune.caip19]: {
        price: '69',
        marketCap: 'to the',
        volume: 'moon',
        changePercent24Hr: 420.69
      }
    }
    return fakeMarketData[assetId]
  })
  mocked(selectFeeAssetById).mockReturnValue(mockEthereum)
  mocked(selectPortfolioCryptoBalanceByAssetId).mockReturnValue(assetBalance)
  ;(useFormContext as jest.Mock<unknown>).mockImplementation(() => ({
    clearErrors: jest.fn(),
    setError,
    setValue,
    formState: { errors: formErrors },
    getValues: () => ({
      cryptoAmount: '1',
      asset
    })
  }))

  const wrapper: React.FC = ({ children }) => <TestProviders>{children}</TestProviders>
  return renderHook(() => useSendDetails(), { wrapper })
}

xdescribe('useSendDetails', () => {
  beforeEach(() => {
    ;(useWallet as jest.Mock<unknown>).mockImplementation(() => ({ state: { wallet: {} } }))
    ;(useHistory as jest.Mock<unknown>).mockImplementation(() => ({ push: jest.fn() }))
    ;(useChainAdapters as jest.Mock<unknown>).mockImplementation(() => ({
      byChain: () => ({
        getAddress: () => '0xMyWalletsAddress',
        getFeeData: () => estimatedFees,
        buildSendTransaction: () => ({
          txToSign: {}
        })
      })
    }))
    ;(findByCaip19 as jest.Mock<unknown>).mockImplementation(() => ({
      price: 3500,
      network: 'ethereum'
    }))
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns the default useSendDetails state', async () => {
    return await act(async () => {
      const { result } = setup({
        assetBalance: balances[ethCaip19]
      })
      expect(result.current.balancesLoading).toBe(false)
      expect(result.current.fieldName).toBe('fiatAmount')
      expect(result.current.loading).toBe(false)
    })
  })

  it('toggles the input field', async () => {
    // eslint-disable-next-line testing-library/no-unnecessary-act
    return await act(async () => {
      const { waitForValueToChange, result } = setup({
        assetBalance: balances[ethCaip19]
      })
      expect(result.current.fieldName).toBe('fiatAmount')
      act(() => {
        result.current.toggleCurrency()
      })
      await waitForValueToChange(() => result.current.fieldName)
      expect(result.current.fieldName).toBe('cryptoAmount')
    })
  })

  it('toggles the amount input error to the fiatAmount/cryptoAmount field', async () => {
    // eslint-disable-next-line testing-library/no-unnecessary-act
    return await act(async () => {
      let setError = jest.fn()
      const { waitForValueToChange, result } = setup({
        assetBalance: balances[ethCaip19],
        formErrors: {
          fiatAmount: { message: 'common.insufficientFunds' }
        },
        setError
      })

      act(() => {
        result.current.toggleCurrency()
      })

      await waitForValueToChange(() => result.current.fieldName)

      expect(result.current.fieldName).toBe('cryptoAmount')
    })
  })

  it('handles input change on fiatAmount', async () => {
    const setValue = jest.fn()
    const { result } = setup({
      assetBalance: balances[ethCaip19],
      setValue
    })
    // Field is set to fiatAmount
    expect(result.current.fieldName).toBe('fiatAmount')

    // Set fiat amount
    await act(async () => {
      result.current.handleInputChange('3500')
      await new Promise(r => setTimeout(r, 1500)) // hack to wait because handleInputChange is now debounced for 1 second
      expect(setValue).toHaveBeenCalledWith('cryptoAmount', '1')

      setValue.mockClear()

      result.current.handleInputChange('0')
      await new Promise(r => setTimeout(r, 1500)) // hack to wait because handleInputChange is now debounced for 1 second
      expect(setValue).toHaveBeenCalledWith('cryptoAmount', '0')
      setValue.mockClear()
    })
  })

  it('handles input change on cryptoAmount', async () => {
    const setValue = jest.fn()
    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      const { waitForValueToChange, result } = setup({
        assetBalance: balances[ethCaip19],
        setValue
      })
      // Field is set to fiatAmount
      expect(result.current.fieldName).toBe('fiatAmount')

      // toggle field to cryptoAmount
      act(() => {
        result.current.toggleCurrency()
      })
      await waitForValueToChange(() => result.current.fieldName)
      expect(result.current.fieldName).toBe('cryptoAmount')

      // Set crypto amount
      await act(async () => {
        result.current.handleInputChange('1')
        await new Promise(r => setTimeout(r, 1500)) // hack to wait because handleInputChange is now debounced for 1 second
        expect(setValue).toHaveBeenCalledWith('fiatAmount', '3500')
        setValue.mockClear()
      })
    })
  })

  it('handles setting up send max for network asset', async () => {
    const setValue = jest.fn()
    const { result } = setup({
      assetBalance: balances[ethCaip19],
      setValue
    })
    await act(async () => {
      await result.current.handleSendMax()
      expect(setValue).toHaveBeenNthCalledWith(1, 'sendMax', true)
      expect(setValue).toHaveBeenNthCalledWith(2, 'estimatedFees', {
        fast: { chainSpecific: { feePerTx: '6000000000000000' }, networkFee: '6000000000000000' }
      })
      expect(setValue).toHaveBeenNthCalledWith(3, 'cryptoAmount', '5')
      expect(setValue).toHaveBeenNthCalledWith(4, 'fiatAmount', '17500.00')
    })
  })

  it('handles setting up send max for erc20', async () => {
    const setValue = jest.fn()
    const { result } = setup({
      asset: mockRune,
      assetBalance: balances[runeCaip19],
      setValue
    })
    await act(async () => {
      await result.current.handleSendMax()
      expect(setValue).toHaveBeenNthCalledWith(1, 'cryptoAmount', '21')
      expect(setValue).toHaveBeenNthCalledWith(2, 'fiatAmount', '14490.00')
    })
  })
})
