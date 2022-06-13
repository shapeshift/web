import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import Web3 from 'web3'

import { erc20Abi } from '../abi/erc20-abi'
import { erc20AllowanceAbi } from '../abi/erc20Allowance-abi'
import { bn, bnOrZero } from '../bignumber'
import { setupDeps } from '../test-data/setupDeps'
import { setupQuote } from '../test-data/setupSwapQuote'
import { getAllowanceRequired, grantAllowance, normalizeAmount } from './helpers'

jest.mock('web3')

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

describe('utils', () => {
  const { tradeQuote, sellAsset } = setupQuote()
  const { web3, adapter } = setupDeps()

  describe('getAllowanceRequired', () => {
    const getAllowanceInput = {
      receiveAddress: '0x0',
      web3,
      erc20AllowanceAbi,
      allowanceContract: '0x0',
      sellAmount: '100',
      sellAsset
    }

    it('should return 0 if the sellAsset symbol is ETH', async () => {
      expect(
        await getAllowanceRequired({
          ...getAllowanceInput,
          sellAsset: { ...sellAsset, assetId: 'eip155:1/slip44:60' }
        })
      ).toEqual(bn(0))
    })

    it('should return sellAmount if allowanceOnChain is 0', async () => {
      const allowanceOnChain = '0'
      ;(web3.eth.Contract as jest.Mock<unknown>).mockImplementation(() => ({
        methods: {
          allowance: jest.fn(() => ({
            call: jest.fn(() => allowanceOnChain)
          }))
        }
      }))

      expect(await getAllowanceRequired(getAllowanceInput)).toEqual(
        bnOrZero(getAllowanceInput.sellAmount)
      )
    })

    it('should throw error if allowanceOnChain is undefined', async () => {
      const allowanceOnChain = undefined
      ;(web3.eth.Contract as jest.Mock<unknown>).mockImplementation(() => ({
        methods: {
          allowance: jest.fn(() => ({
            call: jest.fn(() => allowanceOnChain)
          }))
        }
      }))

      await expect(getAllowanceRequired(getAllowanceInput)).rejects.toThrow(
        `[getAllowanceRequired]`
      )
    })

    it('should return 0 if sellAmount minus allowanceOnChain is negative', async () => {
      const allowanceOnChain = '1000'

      ;(web3.eth.Contract as jest.Mock<unknown>).mockImplementation(() => ({
        methods: {
          allowance: jest.fn(() => ({
            call: jest.fn(() => allowanceOnChain)
          }))
        }
      }))

      expect(await getAllowanceRequired(getAllowanceInput)).toEqual(bn(0))
    })

    it('should return sellAsset minus allowanceOnChain', async () => {
      const allowanceOnChain = '100'

      ;(web3.eth.Contract as jest.Mock<unknown>).mockImplementation(() => ({
        methods: {
          allowance: jest.fn(() => ({
            call: jest.fn(() => allowanceOnChain)
          }))
        }
      }))

      expect(await getAllowanceRequired({ ...getAllowanceInput, sellAmount: '1000' })).toEqual(
        bn(900)
      )
    })
  })

  describe('grantAllowance', () => {
    const walletAddress = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
    const wallet = {
      supportsOfflineSigning: jest.fn(() => true),
      ethGetAddress: jest.fn(() => Promise.resolve(walletAddress))
    } as unknown as HDWallet

    it('should return a txid', async () => {
      const quote = {
        ...tradeQuote
      }
      ;(web3.eth.Contract as jest.Mock<unknown>).mockImplementation(() => ({
        methods: {
          approve: jest.fn(() => ({
            encodeABI: jest.fn(
              () => '0x3a93b3190cbb22d23a07c18959c701a7e7d83257a775b6197b67c648a3f90419'
            )
          }))
        }
      }))
      ;(adapter.buildSendTransaction as jest.Mock).mockResolvedValueOnce({ txToSign: {} })
      ;(adapter.broadcastTransaction as jest.Mock).mockResolvedValueOnce('broadcastedTx')
      expect(await grantAllowance({ quote, wallet, adapter, erc20Abi, web3 })).toEqual(
        'broadcastedTx'
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
