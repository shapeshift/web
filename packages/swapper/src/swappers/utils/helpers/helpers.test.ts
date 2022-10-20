import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import Web3 from 'web3'

import { erc20Abi } from '../abi/erc20-abi'
import { erc20AllowanceAbi } from '../abi/erc20Allowance-abi'
import { bn } from '../bignumber'
import { setupDeps } from '../test-data/setupDeps'
import { setupQuote } from '../test-data/setupSwapQuote'
import {
  grantAllowance,
  isApprovalRequired,
  IsApprovalRequiredArgs,
  normalizeAmount,
  normalizeIntegerAmount,
} from './helpers'

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

describe('utils', () => {
  const { tradeQuote, sellAsset } = setupQuote()
  const { web3, adapter } = setupDeps()

  describe('isApprovalRequired', () => {
    const getAllowanceInput: IsApprovalRequiredArgs = {
      adapter,
      receiveAddress: '0x0',
      web3,
      erc20AllowanceAbi,
      allowanceContract: '0x0',
      sellAmount: '100',
      sellAsset,
    }

    it('should return false if the sellAsset symbol is ETH', async () => {
      expect(
        await isApprovalRequired({
          ...getAllowanceInput,
          sellAsset: { ...sellAsset, assetId: 'eip155:1/slip44:60' },
        }),
      ).toEqual(false)
    })

    it('should return true if allowanceOnChain is 0', async () => {
      const allowanceOnChain = '0'
      ;(web3.eth.Contract as jest.Mock<unknown>).mockImplementation(() => ({
        methods: {
          allowance: jest.fn(() => ({
            call: jest.fn(() => allowanceOnChain),
          })),
        },
      }))

      expect(await isApprovalRequired(getAllowanceInput)).toEqual(true)
    })

    it('should throw error if allowanceOnChain is undefined', async () => {
      const allowanceOnChain = undefined
      ;(web3.eth.Contract as jest.Mock<unknown>).mockImplementation(() => ({
        methods: {
          allowance: jest.fn(() => ({
            call: jest.fn(() => allowanceOnChain),
          })),
        },
      }))

      await expect(isApprovalRequired(getAllowanceInput)).rejects.toThrow(`[isApprovalRequired]`)
    })

    it('should return false if sellAmount minus allowanceOnChain is negative', async () => {
      const allowanceOnChain = '1000'

      ;(web3.eth.Contract as jest.Mock<unknown>).mockImplementation(() => ({
        methods: {
          allowance: jest.fn(() => ({
            call: jest.fn(() => allowanceOnChain),
          })),
        },
      }))

      expect(await isApprovalRequired(getAllowanceInput)).toEqual(false)
    })
  })

  describe('grantAllowance', () => {
    const walletAddress = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
    const wallet = {
      supportsOfflineSigning: jest.fn(() => true),
      ethGetAddress: jest.fn(() => Promise.resolve(walletAddress)),
    } as unknown as HDWallet

    it('should return a txid', async () => {
      const quote = {
        ...tradeQuote,
      }
      ;(web3.eth.Contract as jest.Mock<unknown>).mockImplementation(() => ({
        methods: {
          approve: jest.fn(() => ({
            encodeABI: jest.fn(
              () => '0x3a93b3190cbb22d23a07c18959c701a7e7d83257a775b6197b67c648a3f90419',
            ),
          })),
        },
      }))
      ;(adapter.buildSendTransaction as jest.Mock).mockResolvedValueOnce({ txToSign: {} })
      ;(adapter.broadcastTransaction as jest.Mock).mockResolvedValueOnce('broadcastedTx')
      expect(await grantAllowance({ quote, wallet, adapter, erc20Abi, web3 })).toEqual(
        'broadcastedTx',
      )
    })
  })

  describe('normalizeAmount', () => {
    it('should return a string number rounded to the 16th decimal place', () => {
      const result = normalizeAmount('586084736227728377283728272309128120398')
      expect(result).toEqual('586084736227728400000000000000000000000')
    })
  })
})

describe('normalizeIntegerAmount', () => {
  it('should return a string number rounded to the 16th decimal place', () => {
    const result = normalizeIntegerAmount('586084736227728377283728272309128120398')
    expect(result).toEqual('586084736227728400000000000000000000000')

    const result2 = normalizeIntegerAmount('586084736227728.3')
    expect(result2).toEqual('586084736227728')
  })

  it('should return a string number rounded to the 16th decimal place with number and bn inputs', () => {
    const result1 = normalizeIntegerAmount(bn('586084736227728377283728272309128120398'))
    expect(result1).toEqual('586084736227728400000000000000000000000')

    const result2 = normalizeIntegerAmount(bn('586084736227728.3'))
    expect(result2).toEqual('586084736227728')

    // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
    const result3 = normalizeIntegerAmount(58608473622772841)
    expect(result3).toEqual('58608473622772840')

    const result4 = normalizeIntegerAmount(586084736227728.3)
    expect(result4).toEqual('586084736227728')
  })
})
