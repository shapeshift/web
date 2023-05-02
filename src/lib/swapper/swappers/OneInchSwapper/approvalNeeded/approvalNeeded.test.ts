import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { Ok } from '@sniptt/monads'
import type { AxiosStatic } from 'axios'
import type { ApprovalNeededInput } from 'lib/swapper/api'

import { setupQuote } from '../../utils/test-data/setupSwapQuote'
import { oneInchService } from '../utils/oneInchService'
import type { OneInchSwapperDeps } from '../utils/types'
import { approvalNeeded } from './approvalNeeded'

jest.mock('../utils/oneInchService', () => {
  const axios: AxiosStatic = jest.createMockFromModule('axios')
  axios.create = jest.fn(() => axios)

  return {
    oneInchService: axios.create(),
  }
})

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

    ;(oneInchService.get as jest.Mock<unknown>).mockReturnValueOnce(
      Promise.resolve(
        Ok({
          data: { allowance: allowanceOnChain },
        }),
      ),
    )

    expect((await approvalNeeded(deps, input)).unwrap().approvalNeeded).toBe(false)
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

    ;(oneInchService.get as jest.Mock<unknown>).mockReturnValueOnce(
      Promise.resolve(
        Ok({
          data: { allowance: allowanceOnChain },
        }),
      ),
    )

    expect((await approvalNeeded(deps, input)).unwrap().approvalNeeded).toBe(true)
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

    ;(oneInchService.get as jest.Mock<unknown>).mockReturnValueOnce(
      Promise.resolve(
        Ok({
          data: { allowance: allowanceOnChain },
        }),
      ),
    )

    expect((await approvalNeeded(deps, input)).unwrap().approvalNeeded).toBe(true)
  })
})
