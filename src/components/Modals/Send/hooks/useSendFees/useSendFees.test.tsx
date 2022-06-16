import { AssetId } from '@shapeshiftoss/caip'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { act, renderHook } from '@testing-library/react-hooks'
import { useFormContext, useWatch } from 'react-hook-form'
import { TestProviders } from 'test/TestProviders'
import { useWallet } from 'hooks/useWallet/useWallet'
import { ReduxState } from 'state/reducer'

import { useSendFees } from './useSendFees'

jest.mock('react-hook-form')
jest.mock('hooks/useWallet/useWallet')
jest.mock('state/slices/selectors', () => ({
  ...jest.requireActual('state/slices/selectors'),
  selectAssetById: (_state: ReduxState, _id: AssetId) => mockEthAsset,
  selectFeeAssetById: (_state: ReduxState, _id: AssetId) => mockEthAsset,
  selectMarketDataById: () => mockEthAsset,
}))

const fees = {
  [FeeDataKey.Slow]: {
    txFee: '42000000000',
    chainSpecific: {
      gasPrice: '123456700',
      gasLimit: '123456700',
    },
  },
  [FeeDataKey.Average]: {
    txFee: '42000000000',
    chainSpecific: {
      gasPrice: '123456700',
      gasLimit: '123456700',
    },
  },
  [FeeDataKey.Fast]: {
    txFee: '42000000000',
    chainSpecific: {
      gasPrice: '123456700',
      gasLimit: '123456700',
    },
  },
}

const mockEthAsset = {
  name: 'Ethereum',
  network: 'ethereum',
  price: 3500,
  symbol: 'eth',
  precision: 18,
}

const setup = ({ asset = {}, estimatedFees = {}, wallet = {} }) => {
  ;(useWallet as jest.Mock<unknown>).mockImplementation(() => ({
    state: { wallet },
  }))
  ;(useWatch as jest.Mock<unknown>).mockImplementation(() => ({ asset, estimatedFees }))

  const wrapper: React.FC = ({ children }) => <TestProviders>{children}</TestProviders>

  return renderHook(() => useSendFees(), { wrapper })
}

describe('useSendFees', () => {
  beforeEach(() => {
    ;(useFormContext as jest.Mock<unknown>).mockImplementation(() => ({ control: {} }))
  })

  it('returns the fees with market data', async () => {
    return await act(async () => {
      const { waitForValueToChange, result } = setup({
        asset: mockEthAsset,
        estimatedFees: fees,
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
        asset: mockEthAsset,
        estimatedFees: fees,
        wallet: {},
      })
      expect(result.current.fees).toBe(null)
    })
  })
})
