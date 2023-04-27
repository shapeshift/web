import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
import Web3 from 'web3'

import type { ApprovalNeededInput } from '../../../api'
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
      wallet: {} as HDWallet,
    }

    const input2 = {
      quote: { ...tradeQuote, sellAsset: BTC },
      wallet: {} as HDWallet,
    }

    expect((await cowApprovalNeeded(args, input1)).unwrapErr()).toMatchObject({
      cause: undefined,
      code: 'UNSUPPORTED_NAMESPACE',
      details: { assetNamespace: 'slip44' },
      message: '[cowApprovalNeeded] - unsupported asset namespace',
      name: 'SwapError',
    })
    expect((await cowApprovalNeeded(args, input2)).unwrapErr()).toMatchObject({
      cause: undefined,
      code: 'UNSUPPORTED_NAMESPACE',
      details: { assetNamespace: 'slip44' },
      message: '[cowApprovalNeeded] - unsupported asset namespace',
      name: 'SwapError',
    })
  })

  it('returns false if allowanceOnChain is greater than quote.sellAmount', async () => {
    const allowanceOnChain = '50'
    const input: ApprovalNeededInput<KnownChainIds.EthereumMainnet> = {
      quote: {
        ...tradeQuote,
        sellAmountBeforeFeesCryptoBaseUnit: '10',
      },
      wallet: {} as HDWallet,
    }
    const mockedAllowance = jest.fn(() => ({
      call: jest.fn(() => allowanceOnChain),
    }))
    ;(web3.eth.Contract as jest.Mock<unknown>).mockImplementation(() => ({
      methods: {
        allowance: mockedAllowance,
      },
    }))

    const maybeApprovalNeeded = await cowApprovalNeeded(args, input)
    expect(maybeApprovalNeeded.isOk()).toBe(true)
    expect(maybeApprovalNeeded.unwrap()).toEqual({
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
      wallet: {} as HDWallet,
    }

    const mockedAllowance = jest.fn(() => ({
      call: jest.fn(() => allowanceOnChain),
    }))
    ;(web3.eth.Contract as jest.Mock<unknown>).mockImplementation(() => ({
      methods: {
        allowance: mockedAllowance,
      },
    }))

    const maybeApprovalNeeded = await cowApprovalNeeded(args, input)
    expect(maybeApprovalNeeded.isErr()).toBe(false)
    expect(maybeApprovalNeeded.unwrap()).toEqual({
      approvalNeeded: true,
    })
    expect(mockedAllowance).toHaveBeenCalledTimes(1)
    expect(mockedAllowance).toHaveBeenCalledWith(
      '0xc770eefad204b5180df6a14ee197d99d808ee52d',
      '0xc92e8bdf79f0507f65a392b0ab4667716bfe0110',
    )
  })
})
