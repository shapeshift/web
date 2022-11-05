import type { AssetId } from '@keepkey/caip'
import { FeeDataKey } from '@keepkey/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { TestProviders } from 'test/TestProviders'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { ReduxState } from 'state/reducer'

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

type MockAsset = Record<string, string | number>

const mockEthAsset: MockAsset = {
  name: 'Ethereum',
  network: 'ethereum',
  price: 3500,
  symbol: 'eth',
  precision: 18,
}

type SetupProps = {
  asset: MockAsset
  estimatedFees: Record<string, unknown>
  wallet: HDWallet | null | undefined
}

const setup = ({ asset = {}, estimatedFees = {}, wallet }: SetupProps) => {
  ;(useWallet as jest.Mock<unknown>).mockImplementation(() => ({
    state: { wallet },
  }))
  ;(useWatch as jest.Mock<unknown>).mockImplementation(() => ({ asset, estimatedFees }))

  const wrapper: React.FC<PropsWithChildren> = ({ children }) => (
    <TestProviders>{children}</TestProviders>
  )

  return renderHook(() => useSendFees(), { wrapper })
}

describe('useSendFees', () => {
  beforeEach(() => {
    ;(useFormContext as jest.Mock<unknown>).mockImplementation(() => ({ control: {} }))
  })

  it('returns the fees with market data', async () => {
    const { result } = setup({
      asset: mockEthAsset,
      estimatedFees: fees,
      wallet: {} as HDWallet,
    })
    await waitFor(() => expect(result.current.fees?.slow.fiatFee).toBe('0.000147'))
    expect(result.current.fees?.average.fiatFee).toBe('0.000147')
    expect(result.current.fees?.fast.fiatFee).toBe('0.000147')
  })

  it('returns null fees if no wallet is present', async () => {
    const { result } = setup({
      asset: mockEthAsset,
      estimatedFees: fees,
      wallet: null,
    })
    await waitFor(() => expect(result.current.fees).toBe(null))
  })
})
