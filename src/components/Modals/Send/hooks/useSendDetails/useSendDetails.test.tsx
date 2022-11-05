import { FeeDataKey } from '@keepkey/chain-adapters'
import { KnownChainIds } from '@keepkey/types'
import { act, renderHook, waitFor } from '@testing-library/react'
import { mocked } from 'jest-mock'
import type { PropsWithChildren } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useHistory } from 'react-router-dom'
import { ethereum as mockEthereum, rune as mockRune } from 'test/mocks/assets'
import { TestProviders } from 'test/TestProviders'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { ensLookup } from 'lib/address/ens'
import { fromBaseUnit } from 'lib/math'
import type { PortfolioBalancesById } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import {
  selectFeeAssetById,
  selectMarketDataById,
  selectPortfolioCryptoBalanceByFilter,
  selectPortfolioCryptoHumanBalanceByFilter,
  selectPortfolioFiatBalanceByFilter,
} from 'state/slices/selectors'

import { useSendDetails } from './useSendDetails'

jest.mock('@shapeshiftoss/market-service', () => ({
  findAll: jest.fn,
  findByAssetId: () => ({
    price: 3500,
    network: 'ethereum',
  }),
  findPriceHistoryByAssetId: jest.fn,
}))
jest.mock('react-hook-form')
jest.mock('react-router-dom', () => ({ useHistory: jest.fn() }))
jest.mock('hooks/useWallet/useWallet')
jest.mock('context/PluginProvider/PluginProvider')
jest.mock('context/PluginProvider/chainAdapterSingleton')
jest.mock('lib/address/ens', () => ({ ensLookup: jest.fn() }))

jest.mock('state/slices/selectors', () => ({
  ...jest.requireActual('state/slices/selectors'),
  selectFeeAssetById: jest.fn(),
  selectPortfolioCryptoHumanBalanceByFilter: jest.fn(),
  selectPortfolioCryptoBalanceByFilter: jest.fn(),
  selectPortfolioFiatBalanceByFilter: jest.fn(),
  selectMarketDataById: jest.fn(),
}))

const ethAssetId = 'eip155:1/slip44:60'
const runeAssetId = 'eip155:1/erc20:0x3155ba85d5f96b2d030a4966af206230e46849cb'

const balances: PortfolioBalancesById = {
  [ethAssetId]: '5000000000000000000',
  [runeAssetId]: '21000000000000000000',
}

const runeFiatAmount = '14490.00'

const estimatedFees = {
  [FeeDataKey.Fast]: {
    networkFee: '6000000000000000',
    chainSpecific: {
      feePerTx: '6000000000000000',
    },
  },
}

const setup = ({
  asset = mockEthereum,
  assetBalance = '',
  formErrors = {},
  setError = jest.fn(),
  setValue = jest.fn(),
}) => {
  ;(useWatch as jest.Mock<unknown>).mockImplementation(({ name }) => {
    switch (name) {
      case 'asset':
        return asset
      case 'accountId':
        return 'eip155:1:0x00000005D5F96b2d030a4966AF206230e46849cb'
      default:
        return undefined
    }
  })

  mocked(selectMarketDataById).mockImplementation((_state, assetId) => {
    const fakeMarketData = {
      [mockEthereum.assetId]: {
        price: '3500',
        marketCap: 'bigly',
        volume: 'lots',
        changePercent24Hr: 420.69,
      },
      [mockRune.assetId]: {
        price: '69',
        marketCap: 'to the',
        volume: 'moon',
        changePercent24Hr: 420.69,
      },
    }
    return fakeMarketData[assetId]
  })
  mocked(selectFeeAssetById).mockReturnValue(mockEthereum)
  mocked(selectPortfolioCryptoHumanBalanceByFilter).mockReturnValue(
    fromBaseUnit(assetBalance, asset.precision),
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
      asset,
    }),
  }))

  const wrapper: React.FC<PropsWithChildren> = ({ children }) => (
    <TestProviders>{children}</TestProviders>
  )
  return renderHook(() => useSendDetails(), { wrapper })
}

describe('useSendDetails', () => {
  const mockAdapter = {
    getAddress: () => '0xMyWalletsAddress',
    getFeeData: () => estimatedFees,
    buildSendTransaction: () => ({
      txToSign: {},
    }),
  }
  beforeEach(() => {
    ;(useWallet as jest.Mock<unknown>).mockImplementation(() => ({ state: { wallet: {} } }))
    ;(useHistory as jest.Mock<unknown>).mockImplementation(() => ({ push: jest.fn() }))
    ;(getChainAdapterManager as jest.Mock<unknown>).mockImplementation(
      () =>
        new Map([
          [KnownChainIds.BitcoinMainnet, mockAdapter],
          [KnownChainIds.CosmosMainnet, mockAdapter],
          [KnownChainIds.EthereumMainnet, mockAdapter],
        ]),
    )
    ;(ensLookup as unknown as jest.Mock<unknown>).mockImplementation(async () => ({
      address: '0x05A1ff0a32bc24265BCB39499d0c5D9A6cb2011c',
      error: false,
    }))
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns the default useSendDetails state', async () => {
    const { result } = setup({
      assetBalance: balances[ethAssetId],
    })
    expect(result.current.balancesLoading).toBe(false)
    expect(result.current.fieldName).toBe('cryptoAmount')
    expect(result.current.loading).toBe(false)
  })

  it('toggles the input field', async () => {
    const { result } = setup({
      assetBalance: balances[ethAssetId],
    })
    expect(result.current.fieldName).toBe('cryptoAmount')
    act(() => {
      result.current.toggleCurrency()
    })
    await waitFor(() => expect(result.current.fieldName).toBe('fiatAmount'))
  })

  it('toggles the amount input error to the fiatAmount/cryptoAmount field', async () => {
    let setError = jest.fn()
    const { result } = setup({
      assetBalance: balances[ethAssetId],
      formErrors: {
        fiatAmount: { message: 'common.insufficientFunds' },
      },
      setError,
    })

    act(() => {
      result.current.toggleCurrency()
    })

    await waitFor(() => expect(result.current.fieldName).toBe('fiatAmount'))
  })

  it('handles input change on fiatAmount', async () => {
    jest.useFakeTimers()
    const setValue = jest.fn()
    const { result } = setup({
      assetBalance: balances[ethAssetId],
      setValue,
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
    const { result } = setup({
      assetBalance: balances[ethAssetId],
      setValue,
    })
    // Field is set to fiatAmount
    expect(result.current.fieldName).toBe('cryptoAmount')

    // toggle field to cryptoAmount
    act(() => {
      result.current.toggleCurrency()
    })
    await waitFor(() => result.current.fieldName)
    expect(result.current.fieldName).toBe('fiatAmount')

    // Set crypto amount
    await act(async () => {
      result.current.handleInputChange('3500')
      jest.advanceTimersByTime(1000) // handleInputChange is now debounced for 1 second
      expect(setValue).toHaveBeenCalledWith('cryptoAmount', '1')
      setValue.mockClear()
    })
    jest.useRealTimers()
  })

  it('handles setting up send max for network asset', async () => {
    const setValue = jest.fn()
    const { result } = setup({
      assetBalance: balances[ethAssetId],
      setValue,
    })
    await act(async () => {
      await result.current.handleSendMax()
      expect(setValue).toHaveBeenNthCalledWith(1, 'amountFieldError', '')
      expect(setValue).toHaveBeenNthCalledWith(2, 'sendMax', true)
      expect(setValue).toHaveBeenNthCalledWith(3, 'estimatedFees', {
        fast: {
          chainSpecific: { feePerTx: '6000000000000000' },
          networkFee: '6000000000000000',
        },
      })
      expect(setValue).toHaveBeenNthCalledWith(6, 'fiatAmount', '17500.00')
      expect(setValue).toHaveBeenNthCalledWith(5, 'cryptoAmount', '5')
    })
  })

  it('handles setting up send max for erc20', async () => {
    const setValue = jest.fn()
    const { result } = setup({
      asset: mockRune,
      assetBalance: balances[runeAssetId],
      setValue,
    })
    await act(async () => {
      await result.current.handleSendMax()
      expect(setValue).toHaveBeenNthCalledWith(1, 'amountFieldError', '')
      expect(setValue).toHaveBeenNthCalledWith(2, 'cryptoAmount', '21')
      expect(setValue).toHaveBeenNthCalledWith(3, 'fiatAmount', runeFiatAmount)
    })
  })
})
