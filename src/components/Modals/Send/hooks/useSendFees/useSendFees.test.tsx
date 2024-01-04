import type { AssetId } from '@shapeshiftoss/caip'
import { ethAssetId } from '@shapeshiftoss/caip'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { ethereum as mockEthereum } from 'test/mocks/assets'
import { TestProviders } from 'test/TestProviders'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { ReduxState } from 'state/reducer'

import { useSendFees } from './useSendFees'

vi.mock('react-hook-form')
vi.mock('hooks/useWallet/useWallet')
vi.mock('state/slices/selectors', () => ({
  ...vi.importActual('state/slices/selectors'),
  selectAssetById: (_state: ReduxState, _id: AssetId) => mockEthereum,
  selectFeeAssetById: (_state: ReduxState, _id: AssetId) => mockEthereum,
  selectMarketDataById: () => ({ price: '3500' }),
  selectPortfolioAssetIds: () => [],
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

type SetupProps = {
  assetId: AssetId
  estimatedFees: Record<string, unknown>
  wallet: HDWallet | null | undefined
}

const setup = ({ assetId = ethAssetId, estimatedFees = {}, wallet }: SetupProps) => {
  useWallet.mockImplementation(() => ({
    state: { wallet },
  }))
  useWatch.mockImplementation(() => ({ assetId, estimatedFees }))

  const wrapper: React.FC<PropsWithChildren> = ({ children }) => (
    <TestProviders>{children}</TestProviders>
  )

  return renderHook(() => useSendFees(), { wrapper })
}

describe('useSendFees', () => {
  beforeEach(() => {
    ;(useFormContext as vi.mock<unknown>).mockImplementation(() => ({ control: {} }))
  })

  it('returns the fees with market data', async () => {
    const { result } = setup({
      assetId: ethAssetId,
      estimatedFees: fees,
      wallet: {} as HDWallet,
    })
    await waitFor(() => expect(result.current.fees?.slow.fiatFee).toBe('0.000147'))
    expect(result.current.fees?.average.fiatFee).toBe('0.000147')
    expect(result.current.fees?.fast.fiatFee).toBe('0.000147')
  })

  it('returns null fees if no wallet is present', async () => {
    const { result } = setup({
      assetId: ethAssetId,
      estimatedFees: fees,
      wallet: null,
    })
    await waitFor(() => expect(result.current.fees).toBe(null))
  })
})
