import Web3 from 'web3'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { ChainTypes } from '@shapeshiftoss/types'
import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import { approvalNeeded } from './approvalNeeded'
import { setupQuote } from '../utils/test-data/setupSwapQuote'
import { zrxService } from '../utils/zrxService'
import { APPROVAL_GAS_LIMIT } from '../utils/constants'

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

const setup = () => {
  const unchainedUrls = {
    [ChainTypes.Ethereum]: 'http://localhost:31300/api/v1'
  }
  const ethNodeUrl = 'http://localhost:1000'
  const adapterManager = new ChainAdapterManager(unchainedUrls)
  const web3Provider = new Web3.providers.HttpProvider(ethNodeUrl)
  const web3 = new Web3(web3Provider)

  return { web3, adapterManager }
}

describe('approvalNeeded', () => {
  const { web3, adapterManager } = setup()
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

    expect(await approvalNeeded(args, input)).toEqual({ approvalNeeded: false })
  })

  it('throws an error if sellAsset chain is not ETH', async () => {
    const input = {
      quote: { ...quoteInput, sellAsset: { ...sellAsset, chain: ChainTypes.Bitcoin } },
      wallet
    }

    await expect(approvalNeeded(args, input)).rejects.toThrow(
      'ZrxSwapper:approvalNeeded only Ethereum chain type is supported'
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

    expect(await approvalNeeded(args, input)).toEqual({
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

    expect(await approvalNeeded(args, input)).toEqual({
      approvalNeeded: true,
      gas: APPROVAL_GAS_LIMIT,
      gasPrice: data.gasPrice
    })
  })
})
