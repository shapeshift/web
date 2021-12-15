import { CAIP19 } from '@shapeshiftoss/caip'
import { ChainTypes } from '@shapeshiftoss/types'
import { chainAdapters } from '@shapeshiftoss/types'
import { act, renderHook } from '@testing-library/react-hooks'
import { useFormContext, useWatch } from 'react-hook-form'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useGetAssetData } from 'hooks/useAsset/useAsset'
import { TestProviders } from 'jest/TestProviders'
import { ReduxState } from 'state/reducer'

import { useSendFees } from './useSendFees'

jest.mock('@shapeshiftoss/market-service')
jest.mock('react-hook-form')
jest.mock('context/WalletProvider/WalletProvider')
jest.mock('hooks/useAsset/useAsset')
jest.mock('state/slices/assetsSlice/assetsSlice', () => ({
  ...jest.requireActual('state/slices/assetsSlice/assetsSlice'),
  selectAssetByCAIP19: (_state: ReduxState, _id: CAIP19) => ethAsset
}))

const fees = {
  [chainAdapters.FeeDataKey.Slow]: {
    txFee: '42000000000',
    chainSpecific: {
      gasPrice: '123456700',
      gasLimit: '123456700'
    }
  },
  [chainAdapters.FeeDataKey.Average]: {
    txFee: '42000000000',
    chainSpecific: {
      gasPrice: '123456700',
      gasLimit: '123456700'
    }
  },
  [chainAdapters.FeeDataKey.Fast]: {
    txFee: '42000000000',
    chainSpecific: {
      gasPrice: '123456700',
      gasLimit: '123456700'
    }
  }
}

const ethAsset = {
  name: 'Ethereum',
  network: 'ethereum',
  price: 3500,
  symbol: 'eth',
  precision: 18
}

const getAssetData = () =>
  Promise.resolve({
    name: 'Ethereum',
    chain: ChainTypes.Ethereum,
    price: '3500',
    symbol: 'ETH',
    precision: 18
  })

const setup = ({ asset = {}, estimatedFees = {}, wallet = {} }) => {
  ;(useWallet as jest.Mock<unknown>).mockImplementation(() => ({
    state: { wallet }
  }))
  ;(useWatch as jest.Mock<unknown>).mockImplementation(() => ({ asset, estimatedFees }))

  const wrapper: React.FC = ({ children }) => <TestProviders>{children}</TestProviders>

  return renderHook(() => useSendFees(), { wrapper })
}

describe('useSendFees', () => {
  beforeEach(() => {
    ;(useFormContext as jest.Mock<unknown>).mockImplementation(() => ({ control: {} }))
    ;(useGetAssetData as jest.Mock<unknown>).mockImplementation(() => getAssetData)
  })

  it('returns the fees with market data', async () => {
    return await act(async () => {
      const { waitForValueToChange, result } = setup({
        asset: ethAsset,
        estimatedFees: fees
      })
      await waitForValueToChange(() => result.current.fees)
      expect(result.current.fees?.slow.fiatFee).toBe('0.000147')
      expect(result.current.fees?.average.fiatFee).toBe('0.000147')
      expect(result.current.fees?.fast.fiatFee).toBe('0.000147')
    })
  })

  it('returns null fees if no wallet is present', async () => {
    return await act(async () => {
      const { result } = setup({
        asset: ethAsset,
        estimatedFees: fees,
        wallet: {}
      })
      expect(result.current.fees).toBe(null)
    })
  })
})
