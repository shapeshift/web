import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { ChainTypes } from '@shapeshiftoss/types'
import Web3 from 'web3'

import { APPROVAL_GAS_LIMIT } from '../utils/constants'
import { setupQuote } from '../utils/test-data/setupSwapQuote'
import { setupZrxDeps } from '../utils/test-data/setupZrxDeps'
import { zrxService } from '../utils/zrxService'
import { ZrxApprovalNeeded } from './ZrxApprovalNeeded'

jest.mock('web3')
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn()
  }))
}))

// @ts-ignore
Web3.mockImplementation(() => ({
  eth: {
    Contract: jest.fn(() => ({
      methods: {
        allowance: jest.fn(() => ({
          call: jest.fn()
        }))
      }
    }))
  }
}))

describe('ZrxApprovalNeeded', () => {
  const { web3Instance: web3, adapterManager } = setupZrxDeps()
  const args = { web3, adapterManager }
  const walletAddress = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
  const wallet = ({
    ethGetAddress: jest.fn(() => Promise.resolve(walletAddress))
  } as unknown) as HDWallet

  const { quoteInput, sellAsset } = setupQuote()

  it('returns false if sellAsset symbol is ETH', async () => {
    const input = {
      quote: { ...quoteInput, sellAsset: { ...sellAsset, symbol: 'ETH' } },
      wallet
    }

    expect(await ZrxApprovalNeeded(args, input)).toEqual({ approvalNeeded: false })
  })

  it('throws an error if sellAsset chain is not ETH', async () => {
    const input = {
      quote: { ...quoteInput, sellAsset: { ...sellAsset, chain: ChainTypes.Bitcoin } },
      wallet
    }

    await expect(ZrxApprovalNeeded(args, input)).rejects.toThrow(
      'ZrxSwapper:ZrxApprovalNeeded only Ethereum chain type is supported'
    )
  })

  it('returns false if allowanceOnChain is greater than quote.sellAmount', async () => {
    const allowanceOnChain = '50'
    const data = { gasPrice: '1000', allowanceTarget: '10' }
    const input = {
      quote: { ...quoteInput, sellAmount: '10' },
      wallet
    }
    ;(web3.eth.Contract as jest.Mock<unknown>).mockImplementation(() => ({
      methods: {
        allowance: jest.fn(() => ({
          call: jest.fn(() => allowanceOnChain)
        }))
      }
    }))
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(Promise.resolve({ data }))

    expect(await ZrxApprovalNeeded(args, input)).toEqual({
      approvalNeeded: false,
      gas: APPROVAL_GAS_LIMIT,
      gasPrice: data.gasPrice
    })
  })

  it('returns true if allowanceOnChain is less than quote.sellAmount', async () => {
    const allowanceOnChain = '5'
    const data = { gasPrice: '1000', allowanceTarget: '10' }
    const input = {
      quote: { ...quoteInput, sellAmount: '10' },
      wallet
    }
    ;(web3.eth.Contract as jest.Mock<unknown>).mockImplementation(() => ({
      methods: {
        allowance: jest.fn(() => ({
          call: jest.fn(() => allowanceOnChain)
        }))
      }
    }))
    ;(zrxService.get as jest.Mock<unknown>).mockReturnValue(Promise.resolve({ data }))

    expect(await ZrxApprovalNeeded(args, input)).toEqual({
      approvalNeeded: true,
      gas: APPROVAL_GAS_LIMIT,
      gasPrice: data.gasPrice
    })
  })
})
