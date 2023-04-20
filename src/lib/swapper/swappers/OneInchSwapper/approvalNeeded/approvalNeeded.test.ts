import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
import axios from 'axios'
import type { ApprovalNeededInput } from 'lib/swapper/api'

import { setupQuote } from '../../utils/test-data/setupSwapQuote'
import type { OneInchSwapperDeps } from '../utils/types'
import { approvalNeeded } from './approvalNeeded'

jest.mock('axios')
const mockAxios = axios as jest.Mocked<typeof axios>

const walletAddress = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
jest.mock('context/PluginProvider/chainAdapterSingleton', () => ({
  getChainAdapterManager: () => {
    return {
      get: () => ({
        getAddress: () => walletAddress,
      }),
    }
  },
}))

describe('approvalNeeded', () => {
  const deps: OneInchSwapperDeps = {
    apiUrl: 'https://api.1inch.io/v5.0',
  }
  const wallet = {
    ethGetAddress: jest.fn(() => Promise.resolve(walletAddress)),
  } as unknown as HDWallet

  const { tradeQuote } = setupQuote()

  it('returns false  when existing approval is in place', async () => {
    const allowanceOnChain = '50'
    const input: ApprovalNeededInput<KnownChainIds.EthereumMainnet> = {
      quote: {
        ...tradeQuote,
        sellAmountBeforeFeesCryptoBaseUnit: '10',
        feeData: {
          chainSpecific: { gasPriceCryptoBaseUnit: '1000' },
          buyAssetTradeFeeUsd: '0',
          sellAssetTradeFeeUsd: '0',
          networkFeeCryptoBaseUnit: '0',
        },
      },
      wallet,
    }

    mockAxios.get.mockImplementationOnce(
      async () =>
        await Promise.resolve({
          data: { allowance: allowanceOnChain },
        }),
    )

    expect((await approvalNeeded(deps, input)).approvalNeeded).toBe(false)
  })

  it('returns true when existing approval is in place but too low', async () => {
    const allowanceOnChain = '9'
    const input: ApprovalNeededInput<KnownChainIds.EthereumMainnet> = {
      quote: {
        ...tradeQuote,
        sellAmountBeforeFeesCryptoBaseUnit: '10',
        feeData: {
          chainSpecific: { gasPriceCryptoBaseUnit: '1000' },
          buyAssetTradeFeeUsd: '0',
          sellAssetTradeFeeUsd: '0',
          networkFeeCryptoBaseUnit: '0',
        },
      },
      wallet,
    }

    mockAxios.get.mockImplementationOnce(
      async () =>
        await Promise.resolve({
          data: { allowance: allowanceOnChain },
        }),
    )

    expect((await approvalNeeded(deps, input)).approvalNeeded).toBe(true)
  })

  it('returns true when no approval is in place', async () => {
    const allowanceOnChain = '0'
    const input: ApprovalNeededInput<KnownChainIds.EthereumMainnet> = {
      quote: {
        ...tradeQuote,
        sellAmountBeforeFeesCryptoBaseUnit: '10',
        feeData: {
          chainSpecific: { gasPriceCryptoBaseUnit: '1000' },
          buyAssetTradeFeeUsd: '0',
          sellAssetTradeFeeUsd: '0',
          networkFeeCryptoBaseUnit: '0',
        },
      },
      wallet,
    }

    mockAxios.get.mockImplementationOnce(
      async () =>
        await Promise.resolve({
          data: { allowance: allowanceOnChain },
        }),
    )

    expect((await approvalNeeded(deps, input)).approvalNeeded).toBe(true)
  })
})
