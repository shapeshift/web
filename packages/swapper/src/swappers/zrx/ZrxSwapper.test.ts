import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { SwapperType } from '@shapeshiftoss/types'
import Web3 from 'web3'

import { ZrxSwapper } from '..'
import { zrxBuildTrade } from '../zrx/zrxBuildTrade/zrxBuildTrade'
import { getZrxMinMax } from './getZrxMinMax/getZrxMinMax'
import { getZrxTradeQuote } from './getZrxTradeQuote/getZrxTradeQuote'
import { getUsdRate } from './utils/helpers/helpers'
import { FOX } from './utils/test-data/assets'
import { setupBuildTrade, setupExecuteTrade, setupQuote } from './utils/test-data/setupSwapQuote'
import { ZrxApprovalNeeded } from './ZrxApprovalNeeded/ZrxApprovalNeeded'
import { ZrxApproveInfinite } from './ZrxApproveInfinite/ZrxApproveInfinite'
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

jest.mock('./ZrxApprovalNeeded/ZrxApprovalNeeded', () => ({
  ZrxApprovalNeeded: jest.fn()
}))

jest.mock('./ZrxApproveInfinite/ZrxApproveInfinite', () => ({
  ZrxApproveInfinite: jest.fn()
}))

describe('ZrxSwapper', () => {
  const wallet = <HDWallet>{}
  const web3 = <Web3>{}
  const adapterManager = <ChainAdapterManager>{}
  const zrxSwapperDeps = { web3, adapterManager }

  it('calls getZrxTradeQuote on getTradeQuote', async () => {
    const { quoteInput } = setupQuote()
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    await swapper.getTradeQuote(quoteInput)
    expect(getZrxTradeQuote).toHaveBeenCalled()
  })
  it('returns Zrx type', () => {
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    const type = swapper.getType()
    expect(type).toBe(SwapperType.Zrx)
  })
  it('calls zrxBuildTrade on swapper.buildQuoteTx', async () => {
    const { buildTradeInput } = setupBuildTrade()
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    const args = { ...buildTradeInput, wallet }
    await swapper.buildTrade(args)
    expect(zrxBuildTrade).toHaveBeenCalled()
  })
  it('calls ZrxExecuteTrade on swapper.executeTrade', async () => {
    const { executeTradeInput } = setupExecuteTrade()
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    const args = { trade: executeTradeInput, wallet }
    await swapper.executeTrade(args)
    expect(zrxExecuteTrade).toHaveBeenCalled()
  })
  it('calls getUsdRate on swapper.getUsdRate', async () => {
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    await swapper.getUsdRate(FOX)
    expect(getUsdRate).toHaveBeenCalled()
  })
  it('calls getZrxMinMax on swapper.getMinMax', async () => {
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    const { quoteInput } = setupQuote()
    await swapper.getMinMax(quoteInput)
    expect(getZrxMinMax).toHaveBeenCalled()
  })

  it('calls ZrxApprovalNeeded on swapper.approvalNeeded', async () => {
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    const { tradeQuote } = setupQuote()
    const args = { quote: tradeQuote, wallet }
    await swapper.approvalNeeded(args)
    expect(ZrxApprovalNeeded).toHaveBeenCalled()
  })

  it('calls ZrxApproveInfinite on swapper.approveInfinite', async () => {
    const swapper = new ZrxSwapper(zrxSwapperDeps)
    const { tradeQuote } = setupQuote()
    const args = { quote: tradeQuote, wallet }
    await swapper.approveInfinite(args)
    expect(ZrxApproveInfinite).toHaveBeenCalled()
  })
})
