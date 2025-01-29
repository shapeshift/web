import type { AssetId } from '@shapeshiftoss/caip'
import { ethAssetId } from '@shapeshiftoss/caip'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import type { DeepPartialSkipArrayKey, UseFormReturn } from 'react-hook-form'
import { useFormContext, useWatch } from 'react-hook-form'
import { ethereum as mockEthereum } from 'test/mocks/assets'
import { TestProviders } from 'test/TestProviders'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IWalletContext } from 'context/WalletProvider/WalletContext'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { ReduxState } from 'state/reducer'

import { useSendFees } from './useSendFees'

vi.mock('react-hook-form')
vi.mock('hooks/useWallet/useWallet')
vi.mock('state/slices/selectors', () => ({
  ...vi.importActual('state/slices/selectors'),
  selectUserCurrencyToUsdRate: () => '1',
  selectMarketDataUsd: vi.fn(() => ({})),
  selectAssetById: (_state: ReduxState, _id: AssetId) => mockEthereum,
  selectFeeAssetById: (_state: ReduxState, _id: AssetId) => mockEthereum,
  selectMarketDataByAssetIdUserCurrency: () => ({ price: '3500' }),
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
  wallet: HDWallet | null
}

const setup = ({ assetId = ethAssetId, estimatedFees = {}, wallet }: SetupProps) => {
  vi.mocked(useWallet).mockImplementation(
    () =>
      ({
        state: { wallet },
      }) as IWalletContext,
  )
  vi.mocked(useWatch).mockImplementation(
    () => ({ assetId, estimatedFees }) as unknown as DeepPartialSkipArrayKey<any>,
  )

  const wrapper: React.FC<PropsWithChildren> = ({ children }) => (
    <TestProviders>{children}</TestProviders>
  )

  return renderHook(() => useSendFees(), { wrapper })
}

describe('useSendFees', () => {
  beforeEach(() => {
    vi.mocked(useFormContext).mockImplementation(
      () =>
        ({
          control: {},
        }) as UseFormReturn<any>,
    )
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
