import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import Web3 from 'web3'

import { setupDeps } from '../../utils/test-data/setupDeps'
import { setupQuote } from '../../utils/test-data/setupSwapQuote'
import { CowApproveInfinite } from '../CowApproveInfinite/CowApproveInfinite'

jest.mock('web3')
jest.mock('../../utils/helpers/helpers', () => ({
  grantAllowance: jest.fn(() => 'grantAllowanceTxId')
}))

// @ts-ignore
Web3.mockImplementation(() => ({
  eth: {
    Contract: jest.fn(() => ({
      methods: {
        approve: jest.fn(() => ({
          encodeABI: jest.fn()
        }))
      }
    }))
  }
}))

describe('CowApproveInfinite', () => {
  const { web3, adapter } = setupDeps()
  const { tradeQuote } = setupQuote()
  const wallet = {
    ethGetAddress: jest.fn(() => Promise.resolve('0xc770eefad204b5180df6a14ee197d99d808ee52d')),
    ethSignTx: jest.fn(() => Promise.resolve({}))
  } as unknown as HDWallet

  it('should return a txid', async () => {
    const deps = { web3, adapter, apiUrl: '' }
    const quote = { ...tradeQuote }

    expect(await CowApproveInfinite(deps, { quote, wallet })).toEqual('grantAllowanceTxId')
  })
})
