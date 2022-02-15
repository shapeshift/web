import { chainAdapters } from '@shapeshiftoss/types'
import { act, renderHook } from '@testing-library/react-hooks'
import { useFormContext, useWatch } from 'react-hook-form'
import { useHistory } from 'react-router-dom'
import { ethereum as mockEthereum, rune as mockRune } from 'test/mocks/assets'
import { TestProviders } from 'test/TestProviders'
import { mocked } from 'ts-jest/utils'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { ensLookup } from 'lib/ens'
import { fromBaseUnit } from 'lib/math'
import { PortfolioBalancesById } from 'state/slices/portfolioSlice/portfolioSlice'
import {
  selectFeeAssetById,
  selectMarketDataById,
  selectPortfolioCryptoBalanceByFilter,
  selectPortfolioCryptoHumanBalanceByFilter,
  selectPortfolioFiatBalanceByFilter
} from 'state/slices/selectors'

import { useSendDetails } from './useSendDetails'

jest.mock('@shapeshiftoss/market-service', () => ({
  findAll: jest.fn,
  findByCaip19: () => ({
    price: 3500,
    network: 'ethereum'
  }),
  findPriceHistoryByCaip19: jest.fn
}))
jest.mock('react-hook-form')
jest.mock('react-router-dom', () => ({ useHistory: jest.fn() }))
jest.mock('context/WalletProvider/WalletProvider')
jest.mock('context/ChainAdaptersProvider/ChainAdaptersProvider')
jest.mock('lib/ens', () => ({ ensLookup: jest.fn() }))

jest.mock('state/slices/selectors', () => ({
  ...jest.requireActual('state/slices/selectors'),
  selectFeeAssetById: jest.fn(),
  selectPortfolioCryptoHumanBalanceByFilter: jest.fn(),
  selectPortfolioCryptoBalanceByFilter: jest.fn(),
  selectPortfolioFiatBalanceByFilter: jest.fn(),
  selectMarketDataById: jest.fn(),
  selectAssets: jest.fn()
}))

const ethCaip19 = 'eip155:1/slip44:60'
const runeCaip19 = 'eip155:1/erc20:0x3155ba85d5f96b2d030a4966af206230e46849cb'

const balances: PortfolioBalancesById = {
  [ethCaip19]: '5000000000000000000',
  [runeCaip19]: '21000000000000000000'
}

const runeFiatAmount = '14490.00'

const estimatedFees = {
  [chainAdapters.FeeDataKey.Fast]: {
    networkFee: '6000000000000000',
    chainSpecific: {
      feePerTx: '6000000000000000'
    }
  }
}

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
  mocked(selectPortfolioCryptoHumanBalanceByFilter).mockReturnValue(
    fromBaseUnit(assetBalance, asset.precision)
  )
  mocked(selectPortfolioCryptoBalanceByFilter).mockReturnValue(assetBalance)
  mocked(selectPortfolioFiatBalanceByFilter).mockReturnValue(runeFiatAmount)
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

describe('useSendDetails', () => {
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
    ;(ensLookup as unknown as jest.Mock<unknown>).mockImplementation(async () => ({
      address: '0x05A1ff0a32bc24265BCB39499d0c5D9A6cb2011c',
      error: false
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
      expect(result.current.fieldName).toBe('cryptoAmount')
      expect(result.current.loading).toBe(false)
    })
  })

  it('toggles the input field', async () => {
    // eslint-disable-next-line testing-library/no-unnecessary-act
    return await act(async () => {
      const { waitForValueToChange, result } = setup({
        assetBalance: balances[ethCaip19]
      })
      expect(result.current.fieldName).toBe('cryptoAmount')
      act(() => {
        result.current.toggleCurrency()
      })
      await waitForValueToChange(() => result.current.fieldName)
      expect(result.current.fieldName).toBe('fiatAmount')
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

      expect(result.current.fieldName).toBe('fiatAmount')
    })
  })

  it('handles input change on fiatAmount', async () => {
    jest.useFakeTimers()
    const setValue = jest.fn()
    const { result } = setup({
      assetBalance: balances[ethCaip19],
      setValue
    })
    // Field is set to fiatAmount
    expect(result.current.fieldName).toBe('cryptoAmount')

    // Set fiat amount
    await act(async () => {
      result.current.handleInputChange('1')
      jest.advanceTimersByTime(1500) // handleInputChange is now debounced for 1 second
      expect(setValue).toHaveBeenCalledWith('fiatAmount', '3500')

      setValue.mockClear()

      result.current.handleInputChange('0')
      jest.advanceTimersByTime(1500) // handleInputChange is now debounced for 1 second
      expect(setValue).toHaveBeenCalledWith('fiatAmount', '0')
      setValue.mockClear()
    })
    jest.useRealTimers()
  })

  it('handles input change on cryptoAmount', async () => {
    jest.useFakeTimers()
    const setValue = jest.fn()
    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      const { waitForValueToChange, result } = setup({
        assetBalance: balances[ethCaip19],
        setValue
      })
      // Field is set to fiatAmount
      expect(result.current.fieldName).toBe('cryptoAmount')

      // toggle field to cryptoAmount
      act(() => {
        result.current.toggleCurrency()
      })
      await waitForValueToChange(() => result.current.fieldName)
      expect(result.current.fieldName).toBe('fiatAmount')

      // Set crypto amount
      await act(async () => {
        result.current.handleInputChange('3500')
        jest.advanceTimersByTime(1000) // handleInputChange is now debounced for 1 second
        expect(setValue).toHaveBeenCalledWith('cryptoAmount', '1')
        setValue.mockClear()
      })
    })
    jest.useRealTimers()
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
      expect(setValue).toHaveBeenNthCalledWith(5, 'fiatAmount', '17500.00')
      expect(setValue).toHaveBeenNthCalledWith(4, 'cryptoAmount', '5')
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
      expect(setValue).toHaveBeenNthCalledWith(2, 'fiatAmount', runeFiatAmount)
    })
  })
})
