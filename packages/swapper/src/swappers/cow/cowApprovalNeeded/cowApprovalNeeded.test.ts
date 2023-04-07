import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import Web3 from 'web3'

import { ApprovalNeededInput } from '../../../api'
import { BTC, ETH } from '../../utils/test-data/assets'
import { setupDeps } from '../../utils/test-data/setupDeps'
import { setupQuote } from '../../utils/test-data/setupSwapQuote'
import { cowApprovalNeeded } from './cowApprovalNeeded'

jest.mock('web3')

// @ts-ignore
Web3.mockImplementation(() => ({
  eth: {
    Contract: jest.fn(() => ({
      methods: {
        allowance: jest.fn(() => ({
          call: jest.fn(),
        })),
      },
    })),
  },
}))

describe('cowApprovalNeeded', () => {
  const { web3, adapter, feeAsset } = setupDeps()
  const args = { web3, adapter, apiUrl: '', feeAsset }
  ;(adapter.getAddress as jest.Mock).mockResolvedValue('0xc770eefad204b5180df6a14ee197d99d808ee52d')
  const { tradeQuote } = setupQuote()

  it('returns false if sellAsset assetId is ETH / non ERC-20', async () => {
    const input1 = {
      quote: { ...tradeQuote, sellAsset: ETH },
      wallet: <HDWallet>{},
    }

    const input2 = {
      quote: { ...tradeQuote, sellAsset: BTC },
      wallet: <HDWallet>{},
    }

    await expect(cowApprovalNeeded(args, input1)).rejects.toThrow(
      '[cowApprovalNeeded] - unsupported asset namespace',
    )
    await expect(cowApprovalNeeded(args, input2)).rejects.toThrow(
      '[cowApprovalNeeded] - unsupported asset namespace',
    )
  })

  it('returns false if allowanceOnChain is greater than quote.sellAmount', async () => {
    const allowanceOnChain = '50'
    const input: ApprovalNeededInput<KnownChainIds.EthereumMainnet> = {
      quote: {
        ...tradeQuote,
        sellAmountBeforeFeesCryptoBaseUnit: '10',
      },
      wallet: <HDWallet>{},
    }
    const mockedAllowance = jest.fn(() => ({
      call: jest.fn(() => allowanceOnChain),
    }))
    ;(web3.eth.Contract as jest.Mock<unknown>).mockImplementation(() => ({
      methods: {
        allowance: mockedAllowance,
      },
    }))

    expect(await cowApprovalNeeded(args, input)).toEqual({
      approvalNeeded: false,
    })
    expect(mockedAllowance).toHaveBeenCalledTimes(1)
    expect(mockedAllowance).toHaveBeenCalledWith(
      '0xc770eefad204b5180df6a14ee197d99d808ee52d',
      '0xc92e8bdf79f0507f65a392b0ab4667716bfe0110',
    )
  })

  it('returns true if allowanceOnChain is less than quote.sellAmount', async () => {
    const allowanceOnChain = '5'
    const input = {
      quote: {
        ...tradeQuote,
        sellAmount: '10',
      },
      wallet: <HDWallet>{},
    }

    const mockedAllowance = jest.fn(() => ({
      call: jest.fn(() => allowanceOnChain),
    }))
    ;(web3.eth.Contract as jest.Mock<unknown>).mockImplementation(() => ({
      methods: {
        allowance: mockedAllowance,
      },
    }))

    expect(await cowApprovalNeeded(args, input)).toEqual({
      approvalNeeded: true,
    })
    expect(mockedAllowance).toHaveBeenCalledTimes(1)
    expect(mockedAllowance).toHaveBeenCalledWith(
      '0xc770eefad204b5180df6a14ee197d99d808ee52d',
      '0xc92e8bdf79f0507f65a392b0ab4667716bfe0110',
    )
  })
})
