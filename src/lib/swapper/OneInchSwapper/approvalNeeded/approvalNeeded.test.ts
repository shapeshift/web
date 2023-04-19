import { KnownChainIds } from '@shapeshiftoss/types'
import axios from 'axios'

import type { OneInchSwapperDeps } from '../utils/types'
import { approvalNeeded } from './approvalNeeded'
import { ApprovalNeededInput } from '@shapeshiftoss/swapper'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { setupQuote } from '../../../../../packages/swapper/src/swappers/utils/test-data/setupSwapQuote'

// jest.mock('axios')
// const mockAxios = axios as jest.Mocked<typeof axios>

describe('approvalNeeded', () => {
  const deps: OneInchSwapperDeps = {
    apiUrl: 'https://api.1inch.io/v5.0',
  }
  const walletAddress = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
  const wallet = {
    ethGetAddress: jest.fn(() => Promise.resolve(walletAddress)),
  } as unknown as HDWallet

  const { tradeQuote, sellAsset } = setupQuote()

  it('returns the correct boolean based on existing approvals', async () => {
    
    const allowanceOnChain = '50'
    const data = { allowanceTarget: '10' }
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
    // TODO: need to mock getting an eth address from the chain adapter?

    // mockAxios.get.mockImplementationOnce(() => ({
    //   data: { allowance: allowanceOnChain },
    // }))

    expect(await approvalNeeded(deps, input)).toBe({
        approvalNeeded: false
      })
  })
})
