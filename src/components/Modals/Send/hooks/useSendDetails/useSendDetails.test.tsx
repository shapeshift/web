import { btcAssetId, cosmosAssetId } from '@shapeshiftoss/caip'
import type {
  CosmosSdkChainAdapter,
  EvmChainAdapter,
  UtxoChainAdapter,
} from '@shapeshiftoss/chain-adapters'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { History, LocationState } from 'history'
import type { PropsWithChildren } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { useFormContext, useWatch } from 'react-hook-form'
import { useHistory } from 'react-router-dom'
import { ethereum as mockEthereum, rune as mockRune } from 'test/mocks/assets'
import { TestProviders } from 'test/TestProviders'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IWalletContext } from 'context/WalletProvider/WalletContext'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { ResolveVanityAddressReturn } from 'lib/address/address'
import { ensLookup } from 'lib/address/ens'
import { fromBaseUnit } from 'lib/math'
import { assertGetCosmosSdkChainAdapter } from 'lib/utils/cosmosSdk'
import { assertGetEvmChainAdapter } from 'lib/utils/evm'
import { assertGetUtxoChainAdapter } from 'lib/utils/utxo'
import type { AssetBalancesById } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import {
  selectFeeAssetById,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectPortfolioUserCurrencyBalanceByFilter,
} from 'state/slices/selectors'

import { useSendDetails } from './useSendDetails'

vi.mock('lib/market-service', () => ({
  findAll: vi.fn,
  findByAssetId: () => ({
    price: 3500,
    network: 'ethereum',
  }),
  findPriceHistoryByAssetId: vi.fn,
}))
vi.mock('react-hook-form')
vi.mock('react-router-dom', () => ({ useHistory: vi.fn() }))
vi.mock('hooks/useWallet/useWallet')
vi.mock('context/PluginProvider/PluginProvider')
vi.mock('lib/utils/cosmosSdk')
vi.mock('lib/utils/evm')
vi.mock('lib/utils/utxo')
vi.mock('lib/address/ens', () => ({ ensLookup: vi.fn() }))

vi.mock('state/slices/selectors', async () => {
  const actual = await vi.importActual('state/slices/selectors')

  return {
    ...actual,
    selectFeeAssetById: vi.fn(),
    selectPortfolioCryptoPrecisionBalanceByFilter: vi.fn(),
    selectPortfolioCryptoBalanceBaseUnitByFilter: vi.fn(),
    selectPortfolioUserCurrencyBalanceByFilter: vi.fn(),
    selectMarketDataByAssetIdUserCurrency: vi.fn(() => ({
      [ethAssetId]: { price: '2000' },
    })),
  }
})

const ethAssetId = 'eip155:1/slip44:60'
const runeAssetId = 'eip155:1/erc20:0x3155ba85d5f96b2d030a4966af206230e46849cb'

const balances: AssetBalancesById = {
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
  setError = vi.fn(),
  setValue = vi.fn(),
}) => {
  vi.mocked(useWatch).mockImplementation((({ name }: { name: string }) => {
    switch (name) {
      case 'assetId':
        return asset.assetId
      case 'accountId':
        return 'eip155:1:0x00000005D5F96b2d030a4966AF206230e46849cb'
      default:
        return undefined
    }
  }) as any)

  vi.mocked(selectMarketDataByAssetIdUserCurrency).mockImplementation((_state, assetId) => {
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
  vi.mocked(selectFeeAssetById).mockReturnValue(mockEthereum)
  vi.mocked(selectPortfolioCryptoPrecisionBalanceByFilter).mockReturnValue(
    fromBaseUnit(assetBalance, asset.precision),
  )
  vi.mocked(selectPortfolioCryptoBalanceBaseUnitByFilter).mockReturnValue(assetBalance)
  vi.mocked(selectPortfolioUserCurrencyBalanceByFilter).mockReturnValue(runeFiatAmount)
  vi.mocked(useFormContext).mockImplementation(
    () =>
      ({
        clearErrors: vi.fn(),
        setError,
        setValue,
        formState: { errors: formErrors },
        getValues: () => ({
          amountCryptoPrecision: '1',
          asset: asset.assetId,
        }),
      }) as unknown as UseFormReturn<any>,
  )

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
  const mockAdapterBtc = Object.assign({}, mockAdapter, {
    getFeeAssetId: () => btcAssetId,
  }) as unknown as UtxoChainAdapter
  const mockAdapterEth = Object.assign({}, mockAdapter, {
    getFeeAssetId: () => ethAssetId,
  }) as unknown as EvmChainAdapter
  const mockAdapterAtom = Object.assign({}, mockAdapter, {
    getFeeAssetId: () => cosmosAssetId,
  }) as unknown as CosmosSdkChainAdapter

  beforeEach(() => {
    vi.mocked(useWallet).mockImplementation(() => ({ state: { wallet: {} } }) as IWalletContext)
    vi.mocked(useHistory).mockImplementation(
      () => ({ push: vi.fn() }) as unknown as History<LocationState>,
    )
    vi.mocked(assertGetCosmosSdkChainAdapter).mockImplementation(() => mockAdapterAtom)
    vi.mocked(assertGetEvmChainAdapter).mockImplementation(() => mockAdapterEth)
    vi.mocked(assertGetUtxoChainAdapter).mockImplementation(() => mockAdapterBtc)
    vi.mocked(ensLookup).mockImplementation(
      () =>
        ({
          address: '0x05A1ff0a32bc24265BCB39499d0c5D9A6cb2011c',
          error: false,
        }) as unknown as Promise<ResolveVanityAddressReturn>,
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the default useSendDetails state', () => {
    const { result } = setup({
      assetBalance: balances[ethAssetId],
    })
    expect(result.current.balancesLoading).toBe(false)
    expect(result.current.fieldName).toBe('amountCryptoPrecision')
    expect(result.current.isLoading).toBe(false)
  })

  it('toggles the input field', async () => {
    const { result } = setup({
      assetBalance: balances[ethAssetId],
    })
    expect(result.current.fieldName).toBe('amountCryptoPrecision')
    act(() => {
      result.current.toggleIsFiat()
    })
    await waitFor(() => expect(result.current.fieldName).toBe('fiatAmount'))
  })

  it('toggles the amount input error to the fiatAmount/amountCryptoPrecision field', async () => {
    let setError = vi.fn()
    const { result } = setup({
      assetBalance: balances[ethAssetId],
      formErrors: {
        fiatAmount: { message: 'common.insufficientFunds' },
      },
      setError,
    })

    act(() => {
      result.current.toggleIsFiat()
    })

    await waitFor(() => expect(result.current.fieldName).toBe('fiatAmount'))
  })

  it('handles input change on fiatAmount', async () => {
    vi.useFakeTimers()
    const setValue = vi.fn()
    const { result } = setup({
      assetBalance: balances[ethAssetId],
      setValue,
    })
    // Field is set to fiatAmount
    expect(result.current.fieldName).toBe('amountCryptoPrecision')

    // Set fiat amount
    await act(async () => {
      await result.current.handleInputChange('1')
      vi.advanceTimersByTime(1500) // handleInputChange is now debounced for 1 second
      expect(setValue).toHaveBeenCalledWith('fiatAmount', '3500')

      setValue.mockClear()

      await result.current.handleInputChange('0')
      vi.advanceTimersByTime(1500) // handleInputChange is now debounced for 1 second
      expect(setValue).toHaveBeenCalledWith('fiatAmount', '0')
      setValue.mockClear()
    })
    vi.useRealTimers()
  })

  it('handles input change on amountCryptoPrecision', async () => {
    vi.useFakeTimers()
    const setValue = vi.fn()
    const { result } = setup({
      assetBalance: balances[ethAssetId],
      setValue,
    })
    // Field is set to fiatAmount
    expect(result.current.fieldName).toBe('amountCryptoPrecision')

    // toggle field to amountCryptoPrecision
    act(() => {
      result.current.toggleIsFiat()
    })
    await waitFor(() => result.current.fieldName)
    expect(result.current.fieldName).toBe('fiatAmount')

    // Set crypto amount
    await act(async () => {
      await result.current.handleInputChange('3500')
      vi.advanceTimersByTime(1000) // handleInputChange is now debounced for 1 second
      expect(setValue).toHaveBeenCalledWith('amountCryptoPrecision', '1')
      setValue.mockClear()
    })
    vi.useRealTimers()
  })

  it('handles setting up send max for network asset', async () => {
    const setValue = vi.fn()
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
      expect(setValue).toHaveBeenNthCalledWith(5, 'amountCryptoPrecision', '5')
    })
  })

  it('handles setting up send max for erc20', async () => {
    const setValue = vi.fn()
    const { result } = setup({
      asset: mockRune,
      assetBalance: balances[runeAssetId],
      setValue,
    })
    await act(async () => {
      await result.current.handleSendMax()
      expect(setValue).toHaveBeenNthCalledWith(1, 'amountFieldError', '')
      expect(setValue).toHaveBeenNthCalledWith(2, 'amountCryptoPrecision', '21')
      expect(setValue).toHaveBeenNthCalledWith(3, 'fiatAmount', runeFiatAmount)
    })
  })
})
