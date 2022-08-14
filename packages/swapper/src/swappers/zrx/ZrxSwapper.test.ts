import { ethereum } from '@shapeshiftoss/chain-adapters'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { SwapperType } from '@shapeshiftoss/swapper'
import { KnownChainIds } from '@shapeshiftoss/types'
import Web3 from 'web3'

import { ZrxSwapper } from '..'
import { FOX } from '../utils/test-data/assets'
import { setupBuildTrade, setupQuote } from '../utils/test-data/setupSwapQuote'
import { getZrxTradeQuote } from './getZrxTradeQuote/getZrxTradeQuote'
import { getUsdRate } from './utils/helpers/helpers'
import { setupExecuteTrade } from './utils/test-data/setupZrxSwapQuote'
import { zrxApprovalNeeded } from './zrxApprovalNeeded/zrxApprovalNeeded'
import { zrxApproveInfinite } from './zrxApprove/zrxApprove'
import { zrxBuildTrade } from './zrxBuildTrade/zrxBuildTrade'
import { zrxExecuteTrade } from './zrxExecuteTrade/zrxExecuteTrade'

jest.mock('./utils/helpers/helpers')
jest.mock('../zrx/zrxExecuteTrade/zrxExecuteTrade', () => ({
  zrxExecuteTrade: jest.fn()
}))

jest.mock('../zrx/zrxBuildTrade/zrxBuildTrade', () => ({
  zrxBuildTrade: jest.fn()
}))

jest.mock('./getZrxTradeQuote/getZrxTradeQuote', () => ({
  getZrxTradeQuote: jest.fn()
}))

jest.mock('./getZrxMinMax/getZrxMinMax', () => ({
  getZrxMinMax: jest.fn()
}))

jest.mock('./zrxApprovalNeeded/zrxApprovalNeeded', () => ({
  zrxApprovalNeeded: jest.fn()
}))

jest.mock('./zrxApprove/zrxApprove', () => ({
  zrxApproveInfinite: jest.fn()
}))

describe('ZrxSwapper', () => {
  const wallet = <HDWallet>{}
  const web3 = <Web3>{}
  const adapter = <ethereum.ChainAdapter>{
    getChainId: () => KnownChainIds.EthereumMainnet
  }
  const zrxEthereumSwapperDeps = { web3, adapter }

  it('calls getZrxTradeQuote on getTradeQuote', async () => {
    const { quoteInput } = setupQuote()
    const swapper = new ZrxSwapper(zrxEthereumSwapperDeps)
    await swapper.getTradeQuote(quoteInput)
    expect(getZrxTradeQuote).toHaveBeenCalled()
  })
  it('returns 0x name', () => {
    const swapper = new ZrxSwapper(zrxEthereumSwapperDeps)
    expect(swapper.name).toBe('0x')
  })
  it('returns Zrx type', () => {
    const swapper = new ZrxSwapper(zrxEthereumSwapperDeps)
    const type = swapper.getType()
    expect(type).toBe(SwapperType.ZrxEthereum)
  })
  it('calls zrxBuildTrade on swapper.buildQuoteTx', async () => {
    const { buildTradeInput } = setupBuildTrade()
    const swapper = new ZrxSwapper(zrxEthereumSwapperDeps)
    await swapper.buildTrade(buildTradeInput)
    expect(zrxBuildTrade).toHaveBeenCalled()
  })
  it('calls ZrxExecuteTrade on swapper.executeTrade', async () => {
    const { executeTradeInput } = setupExecuteTrade()
    const swapper = new ZrxSwapper(zrxEthereumSwapperDeps)
    const args = { trade: executeTradeInput, wallet }
    await swapper.executeTrade(args)
    expect(zrxExecuteTrade).toHaveBeenCalled()
  })
  it('calls getUsdRate on swapper.getUsdRate', async () => {
    const swapper = new ZrxSwapper(zrxEthereumSwapperDeps)
    await swapper.getUsdRate(FOX)
    expect(getUsdRate).toHaveBeenCalled()
  })

  it('calls zrxApprovalNeeded on swapper.approvalNeeded', async () => {
    const swapper = new ZrxSwapper(zrxEthereumSwapperDeps)
    const { tradeQuote } = setupQuote()
    const args = { quote: tradeQuote, wallet }
    await swapper.approvalNeeded(args)
    expect(zrxApprovalNeeded).toHaveBeenCalled()
  })

  it('calls zrxApproveInfinite on swapper.approveInfinite', async () => {
    const swapper = new ZrxSwapper(zrxEthereumSwapperDeps)
    const { tradeQuote } = setupQuote()
    const args = { quote: tradeQuote, wallet }
    await swapper.approveInfinite(args)
    expect(zrxApproveInfinite).toHaveBeenCalled()
  })
})
